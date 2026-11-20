package scanner

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/netip"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/models"
)

// ErrAlreadyRunning — сканирование уже идёт.
var ErrAlreadyRunning = errors.New("сканирование уже выполняется")

// ErrICMPPerm — нет прав на ICMP.
var ErrICMPPerm = errors.New("ICMP недоступен: требуются права администратора. Переключите метод сканирования на TCP")

// Scanner — менеджер сканирования.
type Scanner struct {
	db *sql.DB

	mu         sync.Mutex
	running    bool
	cancel     context.CancelFunc
	historyID  int64
	ipRange    string

	// атомарные счётчики
	total  int64
	done   int64
	online int64

	startedAt  atomic.Pointer[string]
	finishedAt atomic.Pointer[string]
	lastErr    atomic.Pointer[string]

	autoTicker *time.Ticker
	autoStop   chan struct{}
	autoMu     sync.Mutex
}

// New — создаёт сканер.
func New(database *sql.DB) *Scanner {
	return &Scanner{db: database}
}

// Status — текущий прогресс.
func (s *Scanner) Status() models.ScanStatus {
	s.mu.Lock()
	running := s.running
	s.mu.Unlock()
	st := models.ScanStatus{
		Running: running,
		Total:   int(atomic.LoadInt64(&s.total)),
		Done:    int(atomic.LoadInt64(&s.done)),
		Online:  int(atomic.LoadInt64(&s.online)),
	}
	if p := s.startedAt.Load(); p != nil {
		st.StartedAt = p
	}
	if p := s.finishedAt.Load(); p != nil {
		st.FinishedAt = p
	}
	if p := s.lastErr.Load(); p != nil {
		st.LastError = p
	}
	return st
}

// Stop — отменяет текущий скан.
func (s *Scanner) Stop() {
	s.mu.Lock()
	cancel := s.cancel
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// Start — запускает скан (async). Возвращает ошибку, если уже идёт.
func (s *Scanner) Start(from, to, method string, timeoutMs int) error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return ErrAlreadyRunning
	}
	if method == "" {
		method = "tcp"
	}
	if timeoutMs <= 0 {
		timeoutMs = 1500
	}
	ips, err := expandRange(from, to)
	if err != nil {
		s.mu.Unlock()
		return err
	}
	if len(ips) == 0 {
		s.mu.Unlock()
		return errors.New("диапазон IP пуст")
	}
	if len(ips) > 4096 {
		s.mu.Unlock()
		return fmt.Errorf("диапазон слишком большой: %d адресов (максимум 4096)", len(ips))
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.running = true
	s.cancel = cancel
	s.ipRange = from + "-" + to
	s.mu.Unlock()

	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	s.startedAt.Store(&now)
	var nilStr *string
	s.finishedAt.Store(nilStr)
	s.lastErr.Store(nilStr)
	atomic.StoreInt64(&s.total, int64(len(ips)))
	atomic.StoreInt64(&s.done, 0)
	atomic.StoreInt64(&s.online, 0)

	hid, err := db.StartScanHistory(s.db, now, s.ipRange, len(ips))
	if err != nil {
		slog.Warn("scan_history insert failed", "err", err)
	}
	s.historyID = hid

	go s.run(ctx, ips, method, time.Duration(timeoutMs)*time.Millisecond)
	return nil
}

func (s *Scanner) run(ctx context.Context, ips []string, method string, timeout time.Duration) {
	defer func() {
		s.mu.Lock()
		s.running = false
		s.cancel = nil
		s.mu.Unlock()
		fin := time.Now().UTC().Format("2006-01-02T15:04:05Z")
		s.finishedAt.Store(&fin)
		db.FinishScanHistory(s.db, s.historyID, fin, int(atomic.LoadInt64(&s.online)), "finished")
	}()

	slog.Info("скан запущен", "range", s.ipRange, "count", len(ips), "method", method)

	if method == "icmp" {
		// проверка прав до ICMP — «пробный» пинг на loopback
		if _, err := checkICMP(ctx, "127.0.0.1", timeout); err != nil {
			msg := ErrICMPPerm.Error()
			s.lastErr.Store(&msg)
			slog.Error("ICMP недоступен", "err", err)
			db.FinishScanHistory(s.db, s.historyID,
				time.Now().UTC().Format("2006-01-02T15:04:05Z"),
				0, "error: ICMP")
			return
		}
	}

	const workers = 50
	jobs := make(chan string)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for ip := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				online := false
				if method == "icmp" {
					ok, _ := checkICMP(ctx, ip, timeout)
					online = ok
				} else {
					online = checkTCP(ctx, ip, timeout)
				}
				now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
				if online {
					atomic.AddInt64(&s.online, 1)
					dns := lookupName(ctx, ip, 2*time.Second)
					s.upsertOnline(ip, dns, now)
				} else {
					_ = db.UpdateByScanner(s.db, ip, "offline", now, "")
				}
				atomic.AddInt64(&s.done, 1)
			}
		}()
	}
	for _, ip := range ips {
		select {
		case <-ctx.Done():
			break
		case jobs <- ip:
		}
		if ctx.Err() != nil {
			break
		}
	}
	close(jobs)
	wg.Wait()
	slog.Info("скан завершён", "online", atomic.LoadInt64(&s.online), "done", atomic.LoadInt64(&s.done))
}

// upsertOnline — обновляет или создаёт запись для найденного IP.
// Никогда не трогает hostname/comment/inventory_number/group_id/custom_fields.
func (s *Scanner) upsertOnline(ip, dns, now string) {
	_, err := db.FindByIP(s.db, ip)
	if errors.Is(err, sql.ErrNoRows) {
		hostname := dns
		if hostname == "" {
			hostname = ip
		}
		d := models.Device{
			Hostname:        hostname,
			DomainName:      dns,
			IPAddress:       ip,
			Status:          "online",
			LastActivity:    &now,
			CustomFields:    []models.CustomField{},
		}
		_, err := db.CreateEquipment(s.db, d)
		if err != nil {
			slog.Warn("create by scanner failed", "ip", ip, "err", err)
		} else {
			slog.Info("найдено сканером", "ip", ip, "hostname", hostname)
		}
		return
	}
	if err := db.UpdateByScanner(s.db, ip, "online", now, dns); err != nil {
		slog.Warn("update by scanner failed", "ip", ip, "err", err)
	}
}

// expandRange — «from-to» в список IP-строк.
func expandRange(from, to string) ([]string, error) {
	a, err := netip.ParseAddr(strings.TrimSpace(from))
	if err != nil {
		return nil, fmt.Errorf("неверный from: %w", err)
	}
	b, err := netip.ParseAddr(strings.TrimSpace(to))
	if err != nil {
		return nil, fmt.Errorf("неверный to: %w", err)
	}
	a = a.Unmap()
	b = b.Unmap()
	if a.Is4() != b.Is4() {
		return nil, errors.New("from и to должны быть одного семейства (IPv4)")
	}
	if !a.Is4() {
		return nil, errors.New("поддерживается только IPv4-диапазон")
	}
	ai := ipToUint32(a)
	bi := ipToUint32(b)
	if ai > bi {
		ai, bi = bi, ai
	}
	n := int(bi-ai) + 1
	out := make([]string, 0, n)
	for i := ai; i <= bi; i++ {
		out = append(out, uint32ToIP(i).String())
	}
	return out, nil
}

func ipToUint32(a netip.Addr) uint32 {
	b := a.As4()
	return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
}

func uint32ToIP(v uint32) netip.Addr {
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

// ReloadAuto — перезапускает автопроверку по таймеру.
func (s *Scanner) ReloadAuto(speed int, enabled bool, from, to, method string, timeoutMs int) {
	s.autoMu.Lock()
	defer s.autoMu.Unlock()
	if s.autoStop != nil {
		close(s.autoStop)
		s.autoStop = nil
	}
	if s.autoTicker != nil {
		s.autoTicker.Stop()
		s.autoTicker = nil
	}
	if !enabled || speed <= 0 {
		return
	}
	stop := make(chan struct{})
	s.autoStop = stop
	interval := time.Duration(speed) * time.Minute
	s.autoTicker = time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-stop:
				return
			case <-s.autoTicker.C:
				if err := s.Start(from, to, method, timeoutMs); err != nil && !errors.Is(err, ErrAlreadyRunning) {
					slog.Warn("автоскан не запущен", "err", err)
				}
			}
		}
	}()
}

// unused — чтобы компилятор не ругался на strconv, если он не нужен.
var _ = strconv.Itoa
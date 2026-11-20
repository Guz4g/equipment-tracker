package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"equipment-tracker/internal/api"
	"equipment-tracker/internal/config"
	"equipment-tracker/internal/db"
	"equipment-tracker/internal/middleware"
	"equipment-tracker/internal/scanner"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Println("ошибка конфигурации:", err)
		os.Exit(1)
	}

	// лог
	logPath := config.AbsPath(cfg.Log.Path)
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("не удалось открыть лог:", err)
		os.Exit(1)
	}
	defer logFile.Close()
	slog.SetDefault(slog.New(slog.NewTextHandler(logFile, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	// БД
	dbPath := config.AbsPath(cfg.Database.Path)
	database, err := db.Open(dbPath)
	if err != nil {
		slog.Error("не удалось открыть БД", "err", err)
		fmt.Println("ошибка БД:", err)
		os.Exit(1)
	}
	defer database.Close()

	// сканер
	sc := scanner.New(database)
	if s, err := db.GetSettings(database); err == nil {
		sc.ReloadAuto(s.ScanIntervalMinutes, s.AutoScanEnabled,
			s.ScanRangeFrom, s.ScanRangeTo, s.ScanMethod, s.ScanTimeoutMs)
	}

	// API
	h := &api.Handler{DB: database, Scanner: sc}
	mux := http.NewServeMux()
	h.Register(mux)

	// статика из папки на диске (НЕ embed)
	webDir := filepath.Join(config.ExeDir(), "frontend", "dist")
	if _, err := os.Stat(filepath.Join(webDir, "index.html")); os.IsNotExist(err) {
		// fallback: web/dist
		webDir = filepath.Join(config.ExeDir(), "web", "dist")
	}
	if _, err := os.Stat(filepath.Join(webDir, "index.html")); os.IsNotExist(err) {
		fmt.Println("ОШИБКА: index.html не найден.")
		fmt.Println("Соберите фронтенд: cd frontend && npm install && npm run build")
		fmt.Println("Ожидаемый путь:", filepath.Join(config.ExeDir(), "frontend", "dist", "index.html"))
		os.Exit(1)
	}
	slog.Info("статика", "dir", webDir)

	fileServer := http.FileServer(http.Dir(webDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p == "" {
			p = "index.html"
		}
		// если файл существует — отдаём
		full := filepath.Join(webDir, filepath.FromSlash(p))
		if info, err := os.Stat(full); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		// API-пути — 404
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		// SPA-fallback
		http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
	})

	// middleware
	handler := middleware.Whitelist(database, mux)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Bind, cfg.Server.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-stop
		slog.Info("остановка...")
		sc.Stop()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}()

	slog.Info("сервер запущен", "addr", addr, "db", dbPath, "log", logPath, "web", webDir)
	fmt.Printf("Сервер запущен: http://%s:%d\n", cfg.Server.Bind, cfg.Server.Port)
	fmt.Printf("Веб-интерфейс: http://localhost:%d\n", cfg.Server.Port)
	fmt.Println("Нажмите Ctrl+C для остановки")

	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("сервер упал", "err", err)
		fmt.Println("ошибка сервера:", err)
		os.Exit(1)
	}
	slog.Info("сервер остановлен")
}
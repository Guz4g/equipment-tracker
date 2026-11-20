package middleware

import (
	"database/sql"
	"log/slog"
	"net"
	"net/http"
	"net/netip"

	"equipment-tracker/internal/db"
)

// Whitelist — middleware ограничения доступа по IP.
func Whitelist(database *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := extractIP(r)
		addr, err := netip.ParseAddr(clientIP)
		if err != nil {
			forbidden(w, clientIP)
			return
		}
		addr = addr.Unmap()

		entries, err := db.ListWhitelist(database)
		if err != nil || len(entries) == 0 {
			// пусто — разрешаем только loopback
			if addr.IsLoopback() {
				next.ServeHTTP(w, r)
				return
			}
			forbidden(w, clientIP)
			return
		}

		for _, e := range entries {
			if matchEntry(e.IPCidr, addr) {
				next.ServeHTTP(w, r)
				return
			}
		}
		forbidden(w, clientIP)
	})
}

func forbidden(w http.ResponseWriter, ip string) {
	slog.Warn("доступ запрещён", "ip", ip)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusForbidden)
	_, _ = w.Write([]byte(`<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Доступ запрещён</title>
<style>body{font-family:sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#111}
h1{color:#dc2626}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
</head><body>
<h1>Доступ запрещён</h1>
<p>Ваш IP: <code>` + ip + `</code></p>
<p>Обратитесь к администратору для добавления в белый список.</p>
</body></html>`))
}

// extractIP — берёт IP из RemoteAddr, X-Forwarded-For ИГНОРИРУЕТ.
func extractIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// matchEntry — проверяет соответствие IP записи (IP или CIDR).
func matchEntry(entry string, addr netip.Addr) bool {
	if p, err := netip.ParsePrefix(entry); err == nil {
		return p.Contains(addr)
	}
	if a, err := netip.ParseAddr(entry); err == nil {
		return a.Unmap() == addr
	}
	return false
}
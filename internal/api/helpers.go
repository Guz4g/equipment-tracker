package api

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strconv"

	"equipment-tracker/internal/models"
)

// writeJSON — единый JSON-ответ.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// writeErr — ошибка в едином формате.
func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: msg})
}

// decode — читает JSON.
func decode(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// clientIP — IP клиента из RemoteAddr.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// pathID — извлекает id из пути (последний сегмент).
func pathID(r *http.Request) (int64, bool) {
	v := r.PathValue("id")
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0, false
	}
	return id, true
}

// logErr — логирует и возвращает текст для клиента.
func logErr(w http.ResponseWriter, status int, msg string, err error) {
	if err != nil {
		slog.Error(msg, "err", err)
	}
	writeErr(w, status, msg)
}
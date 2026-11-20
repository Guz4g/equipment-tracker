package api

import (
	"database/sql"
	"net/http"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/models"
)

// GetSettings — GET /api/settings
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	s, err := db.GetSettings(h.DB)
	if err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось получить настройки", err)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// SaveSettings — PUT /api/settings (настройки + whitelist)
func (h *Handler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	var s models.Settings
	if err := decode(r, &s); err != nil {
		writeErr(w, http.StatusBadRequest, "неверный JSON")
		return
	}
	if s.ScanMethod != "tcp" && s.ScanMethod != "icmp" {
		writeErr(w, http.StatusBadRequest, "метод сканирования: tcp или icmp")
		return
	}
	if err := db.SaveSettings(h.DB, s); err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось сохранить настройки", err)
		return
	}

	// синхронизация whitelist: удаляем отсутствующие, добавляем новые
	current, _ := db.ListWhitelist(h.DB)
	want := make(map[string]string)
	for _, e := range s.Whitelist {
		want[e.IPCidr] = e.Description
	}
	for _, c := range current {
		if _, ok := want[c.IPCidr]; !ok {
			_ = db.DeleteWhitelist(h.DB, c.ID)
		}
	}
	have := make(map[string]bool)
	for _, c := range current {
		have[c.IPCidr] = true
	}
	for ip, desc := range want {
		if !have[ip] {
			_, _ = db.AddWhitelist(h.DB, ip, desc)
		}
	}

	db.Audit(h.DB, clientIP(r), "update", "settings", 0, "")

	// перезапуск автопроверки
	h.Scanner.ReloadAuto(s.ScanIntervalMinutes, s.AutoScanEnabled,
		s.ScanRangeFrom, s.ScanRangeTo, s.ScanMethod, s.ScanTimeoutMs)

	updated, _ := db.GetSettings(h.DB)
	writeJSON(w, http.StatusOK, updated)
}

var _ = sql.ErrNoRows
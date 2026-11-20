package api

import (
	"errors"
	"net/http"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/scanner"
)

// StartScan — POST /api/scan {from,to,method}
func (h *Handler) StartScan(w http.ResponseWriter, r *http.Request) {
	var body struct {
		From   string `json:"from"`
		To     string `json:"to"`
		Method string `json:"method"`
	}
	_ = decode(r, &body)
	if body.From == "" || body.To == "" {
		s, _ := db.GetSettings(h.DB)
		body.From = s.ScanRangeFrom
		body.To = s.ScanRangeTo
		if body.Method == "" {
			body.Method = s.ScanMethod
		}
	}
	if body.Method == "" {
		body.Method = "tcp"
	}
	s, _ := db.GetSettings(h.DB)
	if err := h.Scanner.Start(body.From, body.To, body.Method, s.ScanTimeoutMs); err != nil {
		if errors.Is(err, scanner.ErrAlreadyRunning) {
			writeErr(w, http.StatusConflict, "Сканирование уже выполняется")
			return
		}
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	db.Audit(h.DB, clientIP(r), "scan", "scan", 0, body.From+"-"+body.To)
	writeJSON(w, http.StatusOK, h.Scanner.Status())
}

// ScanStatus — GET /api/scan/status
func (h *Handler) ScanStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.Scanner.Status())
}

// StopScan — POST /api/scan/stop
func (h *Handler) StopScan(w http.ResponseWriter, r *http.Request) {
	h.Scanner.Stop()
	db.Audit(h.DB, clientIP(r), "scan-stop", "scan", 0, "")
	writeJSON(w, http.StatusOK, h.Scanner.Status())
}
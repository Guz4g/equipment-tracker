package api

import (
	"net/http"
)

// Health — GET /api/health.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	var n int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM equipment`).Scan(&n)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"devices": n,
		"client":  clientIP(r),
	})
}
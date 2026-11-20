package api

import (
	"database/sql"
	"net/http"

	"equipment-tracker/internal/scanner"
)

// Handler — общий контекст API.
type Handler struct {
	DB      *sql.DB
	Scanner *scanner.Scanner
}

// Register — регистрирует все маршруты в mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.Health)

	mux.HandleFunc("GET /api/equipment", h.ListEquipment)
	mux.HandleFunc("POST /api/equipment", h.CreateEquipment)
	mux.HandleFunc("PUT /api/equipment/{id}", h.UpdateEquipment)
	mux.HandleFunc("DELETE /api/equipment/{id}", h.DeleteEquipment)

	mux.HandleFunc("GET /api/groups", h.ListGroups)
	mux.HandleFunc("POST /api/groups", h.CreateGroup)
	mux.HandleFunc("PUT /api/groups/{id}", h.UpdateGroup)
	mux.HandleFunc("DELETE /api/groups/{id}", h.DeleteGroup)

	mux.HandleFunc("POST /api/scan", h.StartScan)
	mux.HandleFunc("GET /api/scan/status", h.ScanStatus)
	mux.HandleFunc("POST /api/scan/stop", h.StopScan)

	mux.HandleFunc("POST /api/inventory/compare", h.InventoryCompare)

	mux.HandleFunc("GET /api/settings", h.GetSettings)
	mux.HandleFunc("PUT /api/settings", h.SaveSettings)

	mux.HandleFunc("GET /api/export/csv", h.ExportCSV)
}
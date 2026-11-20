package api

import (
	"errors"
	"net/http"
	"net/netip"
	"strings"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/models"
)

func (h *Handler) ListEquipment(w http.ResponseWriter, r *http.Request) {
	var groupID *int64
	if g := r.URL.Query().Get("groupId"); g != "" {
		if id, ok := parseID(g); ok {
			groupID = &id
		}
	}
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	list, err := db.ListEquipment(h.DB, groupID, search)
	if err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось получить список устройств", err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) CreateEquipment(w http.ResponseWriter, r *http.Request) {
	var d models.Device
	if err := decode(r, &d); err != nil {
		writeErr(w, http.StatusBadRequest, "неверный JSON")
		return
	}
	if msg := validateDevice(&d); msg != "" {
		writeErr(w, http.StatusBadRequest, msg)
		return
	}
	created, err := db.CreateEquipment(h.DB, d)
	if err != nil {
		if errors.Is(err, db.ErrDuplicateIP) {
			existing, _ := db.FindByIP(h.DB, d.IPAddress)
			writeErr(w, http.StatusConflict,
				"Устройство с IP "+d.IPAddress+" уже существует: "+existing.Hostname)
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось создать устройство", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "create", "equipment", created.ID, created.Hostname)
	writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateEquipment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "неверный id")
		return
	}
	var d models.Device
	if err := decode(r, &d); err != nil {
		writeErr(w, http.StatusBadRequest, "неверный JSON")
		return
	}
	if msg := validateDevice(&d); msg != "" {
		writeErr(w, http.StatusBadRequest, msg)
		return
	}
	updated, err := db.UpdateEquipment(h.DB, id, d)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "устройство не найдено")
			return
		}
		if errors.Is(err, db.ErrDuplicateIP) {
			existing, _ := db.FindByIP(h.DB, d.IPAddress)
			writeErr(w, http.StatusConflict,
				"Устройство с IP "+d.IPAddress+" уже существует: "+existing.Hostname)
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось обновить устройство", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "update", "equipment", id, updated.Hostname)
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteEquipment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "неверный id")
		return
	}
	if err := db.DeleteEquipment(h.DB, id); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "устройство не найдено")
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось удалить устройство", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "delete", "equipment", id, "")
	w.WriteHeader(http.StatusNoContent)
}

func validateDevice(d *models.Device) string {
	d.Hostname = strings.TrimSpace(d.Hostname)
	d.IPAddress = strings.TrimSpace(d.IPAddress)
	if d.Hostname == "" {
		return "hostname не может быть пустым"
	}
	if _, err := netip.ParseAddr(d.IPAddress); err != nil {
		return "неверный IP-адрес: " + d.IPAddress
	}
	if d.Status == "" {
		d.Status = "unknown"
	}
	switch d.Status {
	case "online", "offline", "unknown":
	default:
		return "неверный статус: " + d.Status
	}
	if d.CustomFields == nil {
		d.CustomFields = []models.CustomField{}
	}
	return ""
}

func parseID(s string) (int64, bool) {
	var id int64
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, false
		}
		id = id*10 + int64(c-'0')
	}
	return id, true
}
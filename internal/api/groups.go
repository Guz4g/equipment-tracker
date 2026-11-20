package api

import (
	"errors"
	"net/http"
	"strings"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/models"
)

// ListGroups — GET /api/groups
func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	list, err := db.ListGroups(h.DB)
	if err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось получить список групп", err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// CreateGroup — POST /api/groups {name}
func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "неверный JSON")
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		writeErr(w, http.StatusBadRequest, "название группы обязательно")
		return
	}
	g, err := db.CreateGroup(h.DB, body.Name)
	if err != nil {
		if errors.Is(err, db.ErrDuplicateName) {
			writeErr(w, http.StatusConflict, "группа с таким названием уже существует")
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось создать группу", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "create", "group", g.ID, g.Name)
	writeJSON(w, http.StatusCreated, g)
}

// UpdateGroup — PUT /api/groups/{id}
func (h *Handler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "неверный id")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "неверный JSON")
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		writeErr(w, http.StatusBadRequest, "название группы обязательно")
		return
	}
	g, err := db.UpdateGroup(h.DB, id, body.Name)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "группа не найдена")
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось обновить группу", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "update", "group", id, body.Name)
	writeJSON(w, http.StatusOK, g)
}

// DeleteGroup — DELETE /api/groups/{id}
func (h *Handler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, http.StatusBadRequest, "неверный id")
		return
	}
	if err := db.DeleteGroup(h.DB, id); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "группа не найдена")
			return
		}
		logErr(w, http.StatusInternalServerError, "не удалось удалить группу", err)
		return
	}
	db.Audit(h.DB, clientIP(r), "delete", "group", id, "")
	w.WriteHeader(http.StatusNoContent)
}

var _ = models.Group{}
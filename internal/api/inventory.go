package api

import (
	"bufio"
	"bytes"
	"errors"
	"net/http"
	"strings"

	"equipment-tracker/internal/db"
	"equipment-tracker/internal/models"
)

// InventoryCompare — POST /api/inventory/compare (multipart, поле "file")
func (h *Handler) InventoryCompare(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "не удалось прочитать форму: "+err.Error())
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "файл не передан (поле 'file')")
		return
	}
	defer file.Close()

	// чтение с увеличенным буфером
	sc := bufio.NewScanner(file)
	sc.Buffer(make([]byte, 64*1024), 4*1024*1024)

	norm := func(s string) string {
		s = strings.TrimSpace(strings.TrimPrefix(s, "\ufeff"))
		// нормализация невидимых символов и пробелов
		s = strings.ReplaceAll(s, "\u00a0", " ")
		s = strings.Join(strings.Fields(s), " ")
		return s
	}

	seen := map[string]int{}
	var order []string
	for sc.Scan() {
		line := norm(sc.Text())
		if line == "" {
			continue
		}
		if seen[line] == 0 {
			order = append(order, line)
		}
		seen[line]++
	}
	if err := sc.Err(); err != nil {
		writeErr(w, http.StatusBadRequest, "ошибка чтения файла: "+err.Error())
		return
	}

	devices, err := db.ListEquipment(h.DB, nil, "")
	if err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось получить устройства", err)
		return
	}
	byInv := map[string]models.Device{}
	for _, d := range devices {
		key := norm(d.InventoryNumber)
		if key != "" {
			if _, ok := byInv[key]; !ok {
				byInv[key] = d
			}
		}
	}

	result := models.InventoryResult{
		Matched:          []models.InventoryMatch{},
		Missing:          []string{},
		Extra:            []models.Device{},
		DuplicatesInFile: []string{},
	}
	matchedSet := map[string]bool{}
	for inv, count := range seen {
		if count > 1 {
			result.DuplicatesInFile = append(result.DuplicatesInFile, inv)
		}
	}
	for _, inv := range order {
		if d, ok := byInv[inv]; ok {
			result.Matched = append(result.Matched, models.InventoryMatch{
				InventoryNumber: inv, Device: d,
			})
			matchedSet[inv] = true
		} else {
			result.Missing = append(result.Missing, inv)
		}
	}
	for _, d := range devices {
		key := norm(d.InventoryNumber)
		if key == "" || !matchedSet[key] {
			result.Extra = append(result.Extra, d)
		}
	}

	db.Audit(h.DB, clientIP(r), "inventory-compare", "inventory", 0, "")
	writeJSON(w, http.StatusOK, result)
}

var _ = bytes.MinRead
var _ = errors.New
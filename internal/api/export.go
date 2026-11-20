package api

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"

	"equipment-tracker/internal/db"
)

// ExportCSV — GET /api/export/csv?groupId=&search=
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	var groupID *int64
	if g := r.URL.Query().Get("groupId"); g != "" {
		if id, ok := parseID(g); ok {
			groupID = &id
		}
	}
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	devices, err := db.ListEquipment(h.DB, groupID, search)
	if err != nil {
		logErr(w, http.StatusInternalServerError, "не удалось получить устройства", err)
		return
	}
	groups, _ := db.ListGroups(h.DB)
	gname := map[int64]string{}
	for _, g := range groups {
		gname[g.ID] = g.Name
	}

	buf := &bytes.Buffer{}
	buf.WriteString("\ufeff") // BOM для Excel
	cw := csv.NewWriter(buf)
	cw.Comma = ';'

	_ = cw.Write([]string{
		"ID", "Hostname", "Имя в домене", "IP", "MAC", "Инвентарный №",
		"Группа", "Статус", "Последняя активность", "Комментарий",
		"ОС", "Расположение", "Отдел", "Ответственный", "Доп. поля",
	})
	for _, d := range devices {
		g := ""
		if d.GroupID != nil {
			g = gname[*d.GroupID]
		}
		last := ""
		if d.LastActivity != nil {
			last = *d.LastActivity
		}
		cf := ""
		parts := make([]string, 0, len(d.CustomFields))
		for _, f := range d.CustomFields {
			parts = append(parts, f.Label+"="+f.Value)
		}
		cf = strings.Join(parts, "; ")
		_ = cw.Write([]string{
			fmt.Sprintf("%d", d.ID), d.Hostname, d.DomainName, d.IPAddress,
			d.MACAddress, d.InventoryNumber, g, d.Status, last, d.Comment,
			d.OS, d.Location, d.Department, d.Responsible, cf,
		})
	}
	cw.Flush()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition",
		`attachment; filename="equipment-export.csv"`)
	_, _ = w.Write(buf.Bytes())
}
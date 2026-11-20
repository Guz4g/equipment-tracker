package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"equipment-tracker/internal/models"
)

// ErrDuplicateIP — дубликат IP.
var ErrDuplicateIP = errors.New("duplicate ip")

// ErrNotFound — запись не найдена.
var ErrNotFound = errors.New("not found")

// ListEquipment — список устройств с фильтрами (groupId, search).
func ListEquipment(db *sql.DB, groupID *int64, search string) ([]models.Device, error) {
	q := `SELECT id, hostname, domain_name, ip_address, mac_address, inventory_number,
		group_id, status, last_activity, comment, custom_fields, os, location,
		department, responsible, created_at, updated_at FROM equipment WHERE 1=1`
	var args []any
	if groupID != nil {
		q += " AND group_id = ?"
		args = append(args, *groupID)
	}
	if search != "" {
		q += " AND (LOWER(hostname) LIKE ? OR LOWER(domain_name) LIKE ? OR LOWER(ip_address) LIKE ? OR LOWER(inventory_number) LIKE ? OR LOWER(comment) LIKE ?)"
		s := "%" + strings.ToLower(search) + "%"
		args = append(args, s, s, s, s, s)
	}
	q += " ORDER BY id ASC"
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Device
	for rows.Next() {
		d, err := scanDevice(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	if out == nil {
		out = []models.Device{}
	}
	return out, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanDevice(r rowScanner) (models.Device, error) {
	var d models.Device
	var cfJSON sql.NullString
	var lastAct sql.NullString
	var groupID sql.NullInt64
	if err := r.Scan(
		&d.ID, &d.Hostname, &d.DomainName, &d.IPAddress, &d.MACAddress,
		&d.InventoryNumber, &groupID, &d.Status, &lastAct, &d.Comment,
		&cfJSON, &d.OS, &d.Location, &d.Department, &d.Responsible,
		&d.CreatedAt, &d.UpdatedAt,
	); err != nil {
		return d, err
	}
	if groupID.Valid {
		v := groupID.Int64
		d.GroupID = &v
	}
	if lastAct.Valid {
		v := lastAct.String
		d.LastActivity = &v
	}
	d.CustomFields = []models.CustomField{}
	if cfJSON.Valid && cfJSON.String != "" {
		_ = json.Unmarshal([]byte(cfJSON.String), &d.CustomFields)
	}
	if d.CustomFields == nil {
		d.CustomFields = []models.CustomField{}
	}
	return d, nil
}

// GetEquipment — одно устройство по id.
func GetEquipment(db *sql.DB, id int64) (models.Device, error) {
	row := db.QueryRow(`SELECT id, hostname, domain_name, ip_address, mac_address, inventory_number,
		group_id, status, last_activity, comment, custom_fields, os, location,
		department, responsible, created_at, updated_at FROM equipment WHERE id=?`, id)
	d, err := scanDevice(row)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	return d, err
}

// CreateEquipment — создаёт устройство (id генерирует SQLite).
func CreateEquipment(db *sql.DB, d models.Device) (models.Device, error) {
	cf, _ := json.Marshal(d.CustomFields)
	if d.Status == "" {
		d.Status = "unknown"
	}
	if d.CustomFields == nil {
		cf = []byte("[]")
	}
	res, err := db.Exec(`INSERT INTO equipment
		(hostname, domain_name, ip_address, mac_address, inventory_number, group_id,
		 status, last_activity, comment, custom_fields, os, location, department, responsible)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		d.Hostname, d.DomainName, d.IPAddress, d.MACAddress, d.InventoryNumber, d.GroupID,
		d.Status, d.LastActivity, d.Comment, string(cf), d.OS, d.Location, d.Department, d.Responsible,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return d, ErrDuplicateIP
		}
		return d, err
	}
	id, _ := res.LastInsertId()
	return GetEquipment(db, id)
}

// UpdateEquipment — обновляет устройство по id.
func UpdateEquipment(db *sql.DB, id int64, d models.Device) (models.Device, error) {
	cf, _ := json.Marshal(d.CustomFields)
	if d.CustomFields == nil {
		cf = []byte("[]")
	}
	_, err := db.Exec(`UPDATE equipment SET
		hostname=?, domain_name=?, ip_address=?, mac_address=?, inventory_number=?,
		group_id=?, status=?, last_activity=?, comment=?, custom_fields=?, os=?,
		location=?, department=?, responsible=?,
		updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
		WHERE id=?`,
		d.Hostname, d.DomainName, d.IPAddress, d.MACAddress, d.InventoryNumber, d.GroupID,
		d.Status, d.LastActivity, d.Comment, string(cf), d.OS, d.Location, d.Department, d.Responsible, id,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return d, ErrDuplicateIP
		}
		return d, err
	}
	return GetEquipment(db, id)
}

// DeleteEquipment — удаляет устройство.
func DeleteEquipment(db *sql.DB, id int64) error {
	res, err := db.Exec(`DELETE FROM equipment WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// FindByIP — поиск устройства по IP.
func FindByIP(db *sql.DB, ip string) (models.Device, error) {
	row := db.QueryRow(`SELECT id, hostname, domain_name, ip_address, mac_address, inventory_number,
		group_id, status, last_activity, comment, custom_fields, os, location,
		department, responsible, created_at, updated_at FROM equipment WHERE ip_address=?`, ip)
	return scanDevice(row)
}

// UpdateByScanner — обновление только «серверных» полей из сканера.
// hostname/comment/inventory_number/group_id/custom_fields НЕ трогаются.
func UpdateByScanner(db *sql.DB, ip, status string, now string, domainName string) error {
	_, err := db.Exec(`UPDATE equipment SET
		status=?, last_activity=?, updated_at=?,
		domain_name = CASE WHEN domain_name = '' AND ? <> '' THEN ? ELSE domain_name END
		WHERE ip_address=?`, status, now, now, domainName, domainName, ip)
	return err
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "unique") || strings.Contains(s, "constraint")
}
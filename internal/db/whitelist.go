package db

import (
	"database/sql"

	"equipment-tracker/internal/models"
)

// ListWhitelist — все записи whitelist.
func ListWhitelist(db *sql.DB) ([]models.WhitelistEntry, error) {
	rows, err := db.Query(`SELECT id, ip_cidr, description FROM whitelist ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.WhitelistEntry{}
	for rows.Next() {
		var e models.WhitelistEntry
		if err := rows.Scan(&e.ID, &e.IPCidr, &e.Description); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// AddWhitelist — добавляет запись.
func AddWhitelist(db *sql.DB, ipCidr, description string) (models.WhitelistEntry, error) {
	res, err := db.Exec(`INSERT INTO whitelist(ip_cidr, description) VALUES(?,?)`, ipCidr, description)
	if err != nil {
		if isUniqueViolation(err) {
			return models.WhitelistEntry{}, ErrDuplicateIP
		}
		return models.WhitelistEntry{}, err
	}
	id, _ := res.LastInsertId()
	return models.WhitelistEntry{ID: id, IPCidr: ipCidr, Description: description}, nil
}

// DeleteWhitelist — удаляет запись.
func DeleteWhitelist(db *sql.DB, id int64) error {
	res, err := db.Exec(`DELETE FROM whitelist WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
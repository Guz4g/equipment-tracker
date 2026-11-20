package db

import (
	"database/sql"

	"equipment-tracker/internal/models"
)

// ListGroups — список групп со счётчиком устройств.
func ListGroups(db *sql.DB) ([]models.Group, error) {
	rows, err := db.Query(`SELECT g.id, g.name,
		(SELECT COUNT(*) FROM equipment e WHERE e.group_id = g.id) AS cnt
		FROM groups g ORDER BY g.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Group{}
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.DeviceCount); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// CreateGroup — создаёт группу.
func CreateGroup(db *sql.DB, name string) (models.Group, error) {
	res, err := db.Exec(`INSERT INTO groups(name) VALUES(?)`, name)
	if err != nil {
		if isUniqueViolation(err) {
			return models.Group{}, ErrDuplicateName
		}
		return models.Group{}, err
	}
	id, _ := res.LastInsertId()
	return models.Group{ID: id, Name: name}, nil
}

// UpdateGroup — переименование.
func UpdateGroup(db *sql.DB, id int64, name string) (models.Group, error) {
	res, err := db.Exec(`UPDATE groups SET name=? WHERE id=?`, name, id)
	if err != nil {
		return models.Group{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return models.Group{}, ErrNotFound
	}
	return models.Group{ID: id, Name: name}, nil
}

// DeleteGroup — удаляет группу (у устройств groupId станет NULL благодаря FK).
func DeleteGroup(db *sql.DB, id int64) error {
	res, err := db.Exec(`DELETE FROM groups WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
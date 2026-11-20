package db

import "database/sql"

// Audit — пишет запись в audit_log.
func Audit(db *sql.DB, clientIP, action, entity string, entityID int64, details string) {
	_, _ = db.Exec(`INSERT INTO audit_log(client_ip, action, entity, entity_id, details)
		VALUES(?,?,?,?,?)`, clientIP, action, entity, entityID, details)
}
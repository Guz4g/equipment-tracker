package db

import "database/sql"

// StartScanHistory — создаёт запись о начале скана, возвращает id.
func StartScanHistory(db *sql.DB, startedAt, ipRange string, total int) (int64, error) {
	res, err := db.Exec(`INSERT INTO scan_history(started_at, ip_range, total_hosts, status)
		VALUES(?,?,?,'running')`, startedAt, ipRange, total)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// FinishScanHistory — закрывает запись.
func FinishScanHistory(db *sql.DB, id int64, finishedAt string, online int, status string) {
	_, _ = db.Exec(`UPDATE scan_history SET finished_at=?, online_hosts=?, status=? WHERE id=?`,
		finishedAt, online, status, id)
}
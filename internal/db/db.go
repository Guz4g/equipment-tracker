package db

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)
// ErrDuplicateName — дубликат имени.
var ErrDuplicateName = errors.New("duplicate name")
// Open — открывает БД, применяет PRAGMA и миграции.
func Open(path string) (*sql.DB, error) {
	dsn := "file:" + path + "?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(time.Hour)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS groups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
		);`,
		`CREATE TABLE IF NOT EXISTS equipment (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hostname TEXT NOT NULL,
			domain_name TEXT NOT NULL DEFAULT '',
			ip_address TEXT NOT NULL UNIQUE,
			mac_address TEXT NOT NULL DEFAULT '',
			inventory_number TEXT NOT NULL DEFAULT '',
			group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
			status TEXT NOT NULL DEFAULT 'unknown',
			last_activity TEXT,
			comment TEXT NOT NULL DEFAULT '',
			custom_fields TEXT NOT NULL DEFAULT '[]',
			os TEXT NOT NULL DEFAULT '',
			location TEXT NOT NULL DEFAULT '',
			department TEXT NOT NULL DEFAULT '',
			responsible TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
		);`,
		`CREATE INDEX IF NOT EXISTS idx_eq_group ON equipment(group_id);`,
		`CREATE INDEX IF NOT EXISTS idx_eq_inv ON equipment(inventory_number);`,
		`CREATE TABLE IF NOT EXISTS whitelist (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ip_cidr TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT ''
		);`,
		`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
		`CREATE TABLE IF NOT EXISTS scan_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			started_at TEXT NOT NULL, finished_at TEXT,
			ip_range TEXT, total_hosts INTEGER DEFAULT 0, online_hosts INTEGER DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'running'
		);`,
		`CREATE TABLE IF NOT EXISTS audit_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
			client_ip TEXT, action TEXT, entity TEXT, entity_id INTEGER, details TEXT
		);`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}
	// дефолты настроек
	defaults := map[string]string{
		"scanRangeFrom":       "192.168.1.1",
		"scanRangeTo":         "192.168.1.254",
		"scanIntervalMinutes": "30",
		"scanTimeoutMs":       "1500",
		"scanMethod":          "tcp",
		"autoScanEnabled":     "false",
	}
	for k, v := range defaults {
		_, err := db.Exec(`INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)`, k, v)
		if err != nil {
			return err
		}
	}
	// whitelist по умолчанию — loopback
	_, err := db.Exec(`INSERT OR IGNORE INTO whitelist(ip_cidr,description) VALUES('127.0.0.1','локальный'),('::1','локальный IPv6')`)
	return err
}
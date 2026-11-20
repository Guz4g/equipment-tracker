package db

import (
	"database/sql"
	"strconv"

	"equipment-tracker/internal/models"
)

// GetSettings — читает настройки из settings + whitelist.
func GetSettings(db *sql.DB) (models.Settings, error) {
	var s models.Settings
	get := func(key string) string {
		var v string
		_ = db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
		return v
	}
	s.ScanRangeFrom = get("scanRangeFrom")
	s.ScanRangeTo = get("scanRangeTo")
	s.ScanIntervalMinutes, _ = strconv.Atoi(get("scanIntervalMinutes"))
	if s.ScanIntervalMinutes <= 0 {
		s.ScanIntervalMinutes = 30
	}
	s.ScanTimeoutMs, _ = strconv.Atoi(get("scanTimeoutMs"))
	if s.ScanTimeoutMs <= 0 {
		s.ScanTimeoutMs = 1500
	}
	s.ScanMethod = get("scanMethod")
	if s.ScanMethod == "" {
		s.ScanMethod = "tcp"
	}
	s.AutoScanEnabled = get("autoScanEnabled") == "true"
	wl, err := ListWhitelist(db)
	if err != nil {
		return s, err
	}
	s.Whitelist = wl
	return s, nil
}

// SaveSettings — сохраняет настройки (без whitelist — он отдельно).
func SaveSettings(db *sql.DB, s models.Settings) error {
	set := func(k, v string) error {
		_, err := db.Exec(`INSERT INTO settings(key,value) VALUES(?,?)
			ON CONFLICT(key) DO UPDATE SET value=excluded.value`, k, v)
		return err
	}
	if err := set("scanRangeFrom", s.ScanRangeFrom); err != nil {
		return err
	}
	if err := set("scanRangeTo", s.ScanRangeTo); err != nil {
		return err
	}
	if err := set("scanIntervalMinutes", strconv.Itoa(s.ScanIntervalMinutes)); err != nil {
		return err
	}
	if err := set("scanTimeoutMs", strconv.Itoa(s.ScanTimeoutMs)); err != nil {
		return err
	}
	if err := set("scanMethod", s.ScanMethod); err != nil {
		return err
	}
	if err := set("autoScanEnabled", boolStr(s.AutoScanEnabled)); err != nil {
		return err
	}
	return nil
}

func boolStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}
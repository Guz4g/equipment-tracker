package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config — внешний конфиг (config.json рядом с exe).
type Config struct {
	Server struct {
		Port int    `json:"port"`
		Bind string `json:"bind"`
	} `json:"server"`
	Database struct {
		Path string `json:"path"`
	} `json:"database"`
	Log struct {
		Path  string `json:"path"`
		Level string `json:"level"`
	} `json:"log"`
}

// ExeDir — директория исполняемого файла.
func ExeDir() string {
	exe, err := os.Executable()
	if err != nil {
		wd, _ := os.Getwd()
		return wd
	}
	return filepath.Dir(exe)
}

// AbsPath — превращает относительный путь в абсолютный относительно ExeDir.
func AbsPath(p string) string {
	if filepath.IsAbs(p) {
		return p
	}
	return filepath.Join(ExeDir(), p)
}

// Load — читает config.json или создаёт дефолтный.
func Load() (*Config, error) {
	cfgPath := filepath.Join(ExeDir(), "config.json")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		cfg := defaultConfig()
		buf, _ := json.MarshalIndent(cfg, "", "  ")
		_ = os.WriteFile(cfgPath, buf, 0644)
		return cfg, nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8080
	}
	if cfg.Server.Bind == "" {
		cfg.Server.Bind = "0.0.0.0"
	}
	if cfg.Database.Path == "" {
		cfg.Database.Path = "data.db"
	}
	if cfg.Log.Path == "" {
		cfg.Log.Path = "app.log"
	}
	if cfg.Log.Level == "" {
		cfg.Log.Level = "info"
	}
	return &cfg, nil
}

func defaultConfig() *Config {
	c := &Config{}
	c.Server.Port = 8080
	c.Server.Bind = "0.0.0.0"
	c.Database.Path = "data.db"
	c.Log.Path = "app.log"
	c.Log.Level = "info"
	return c
}
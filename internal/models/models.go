package models

// CustomField — произвольное дополнительное поле устройства.
type CustomField struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value string `json:"value"`
}

// Device — запись об устройстве.
type Device struct {
	ID              int64         `json:"id"`
	Hostname        string        `json:"hostname"`
	DomainName      string        `json:"domainName"`
	IPAddress       string        `json:"ipAddress"`
	MACAddress      string        `json:"macAddress"`
	InventoryNumber string        `json:"inventoryNumber"`
	GroupID         *int64        `json:"groupId"`
	Status          string        `json:"status"`
	LastActivity    *string       `json:"lastActivity"`
	Comment         string        `json:"comment"`
	CustomFields    []CustomField `json:"customFields"`
	OS              string        `json:"os"`
	Location        string        `json:"location"`
	Department      string        `json:"department"`
	Responsible     string        `json:"responsible"`
	CreatedAt       string        `json:"createdAt"`
	UpdatedAt       string        `json:"updatedAt"`
}

// Group — группа устройств (кабинет/отдел).
type Group struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	DeviceCount int    `json:"deviceCount,omitempty"`
}

// WhitelistEntry — разрешённый IP или CIDR.
type WhitelistEntry struct {
	ID          int64  `json:"id"`
	IPCidr      string `json:"ipCidr"`
	Description string `json:"description"`
}

// Settings — настройки сканера + whitelist.
type Settings struct {
	ScanRangeFrom       string           `json:"scanRangeFrom"`
	ScanRangeTo         string           `json:"scanRangeTo"`
	ScanIntervalMinutes int              `json:"scanIntervalMinutes"`
	ScanTimeoutMs       int              `json:"scanTimeoutMs"`
	ScanMethod          string           `json:"scanMethod"`
	AutoScanEnabled     bool             `json:"autoScanEnabled"`
	Whitelist           []WhitelistEntry `json:"whitelist"`
}

// ScanStatus — состояние сканирования.
type ScanStatus struct {
	Running    bool    `json:"running"`
	Total      int     `json:"total"`
	Done       int     `json:"done"`
	Online     int     `json:"online"`
	StartedAt  *string `json:"startedAt"`
	FinishedAt *string `json:"finishedAt"`
	LastError  *string `json:"lastError"`
}

// InventoryResult — результат сравнения инвентаризации.
type InventoryResult struct {
	Matched          []InventoryMatch `json:"matched"`
	Missing          []string         `json:"missing"`
	Extra            []Device         `json:"extra"`
	DuplicatesInFile []string         `json:"duplicatesInFile"`
}

// InventoryMatch — совпавшая запись.
type InventoryMatch struct {
	InventoryNumber string `json:"inventoryNumber"`
	Device          Device `json:"device"`
}

// ErrorResponse — единый формат ошибки.
type ErrorResponse struct {
	Error string `json:"error"`
}
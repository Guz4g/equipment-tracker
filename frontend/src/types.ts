export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface Device {
  id: number;
  hostname: string;
  domainName: string;
  ipAddress: string;
  macAddress: string;
  inventoryNumber: string;
  groupId: number | null;
  status: DeviceStatus;
  lastActivity: string | null;
  comment: string;
  customFields: CustomField[];
  os: string;
  location: string;
  department: string;
  responsible: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  name: string;
  deviceCount?: number;
}

export interface WhitelistEntry {
  id: number;
  ipCidr: string;
  description: string;
}

export interface Settings {
  scanRangeFrom: string;
  scanRangeTo: string;
  scanIntervalMinutes: number;
  scanTimeoutMs: number;
  scanMethod: 'tcp' | 'icmp';
  autoScanEnabled: boolean;
  whitelist: WhitelistEntry[];
}

export interface ScanStatus {
  running: boolean;
  total: number;
  done: number;
  online: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
}

export interface InventoryMatch {
  inventoryNumber: string;
  device: Device;
}

export interface InventoryResult {
  matched: InventoryMatch[];
  missing: string[];
  extra: Device[];
  duplicatesInFile: string[];
}

export type Tab = 'equipment' | 'groups' | 'inventory' | 'settings';
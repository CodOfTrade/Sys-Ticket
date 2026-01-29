export enum ResourceType {
  COMPUTER = 'computer',
  PRINTER = 'printer',
  MONITOR = 'monitor',
  NETWORK_DEVICE = 'network_device',
  SERVER = 'server',
  OTHER = 'other',
}

export enum ResourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum AntivirusStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUTDATED = 'outdated',
}

export enum LicenseType {
  WINDOWS = 'windows',
  OFFICE = 'office',
  ANTIVIRUS = 'antivirus',
  CUSTOM = 'custom',
}

export enum LicenseStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum ActivationType {
  SERIAL = 'serial',
  ACCOUNT = 'account',
  HYBRID = 'hybrid',
}

export enum DurationType {
  MONTHS = 'months',
  YEARS = 'years',
}

export enum ResourceEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  AGENT_INSTALLED = 'agent_installed',
  AGENT_REMOVED = 'agent_removed',
  LICENSE_ASSIGNED = 'license_assigned',
  LICENSE_REMOVED = 'license_removed',
  RETIRED = 'retired',
  COMMAND_SENT = 'command_sent',
  COMMAND_EXECUTED = 'command_executed',
}

export interface Resource {
  id: string;
  resource_code: string;
  name: string;
  resource_type: ResourceType;
  client_id: string;
  contract_id?: string;
  resource_group?: string;
  location?: string;
  department?: string;
  status: ResourceStatus;
  is_online: boolean;
  last_seen_at?: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  asset_tag?: string;
  purchase_date?: string;
  warranty_expiry_date?: string;
  agent_id?: string;
  agent_version?: string;
  agent_installed_at?: string;
  agent_last_heartbeat?: string;
  pending_command?: string;
  pending_command_at?: string;
  specifications?: Record<string, any>;
  installed_software?: Record<string, any>;
  os_name?: string;
  os_version?: string;
  os_architecture?: string;
  os_last_updated?: string;
  antivirus_name?: string;
  antivirus_version?: string;
  antivirus_last_updated?: string;
  antivirus_status?: AntivirusStatus;
  ip_address?: string;
  mac_address?: string;
  hostname?: string;
  custom_fields?: Record<string, any>;
  metadata?: Record<string, any>;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  retired_at?: string;
  licenses?: ResourceLicense[];
  history?: ResourceHistory[];
}

export interface SigeClient {
  id: string;
  sigeId: string;
  nome: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cpfCnpj?: string;
  tipoPessoa?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo: boolean;
}

export interface ResourceLicense {
  id: string;
  license_key?: string;
  activation_type?: ActivationType;
  linked_email?: string;
  license_type: LicenseType;
  product_name: string;
  product_version?: string;
  client_id: string;
  contract_id?: string;
  resource_id?: string;
  assigned_to_user?: string;
  license_status: LicenseStatus;
  purchase_date?: string;
  expiry_date?: string;
  is_perpetual: boolean;
  duration_type?: DurationType;
  duration_value?: number;
  activation_date?: string;
  max_activations?: number;
  current_activations: number;
  vendor?: string;
  purchase_order?: string;
  cost?: number;
  custom_fields?: Record<string, any>;
  notes?: string;
  notification_email?: string;
  requester_name?: string;
  requester_phone?: string;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  deactivated_at?: string;
  resource?: Resource;
  client?: SigeClient;
  device_assignments?: LicenseDeviceAssignment[];
}

export interface LicenseDeviceAssignment {
  id: string;
  license_id: string;
  resource_id: string;
  assigned_by?: string;
  notes?: string;
  assigned_at: string;
  license?: ResourceLicense;
  resource?: Resource;
}

export interface ContractResourceQuota {
  id: string;
  contract_id: string;
  client_id: string;
  computers_quota: number;
  computers_used: number;
  printers_quota: number;
  printers_used: number;
  monitors_quota: number;
  monitors_used: number;
  servers_quota: number;
  servers_used: number;
  windows_licenses_quota: number;
  windows_licenses_used: number;
  office_licenses_quota: number;
  office_licenses_used: number;
  antivirus_licenses_quota: number;
  antivirus_licenses_used: number;
  custom_quotas?: Record<string, any>;
  allow_exceed: boolean;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceHistory {
  id: string;
  resource_id: string;
  event_type: ResourceEventType;
  event_description?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changed_by_user_id?: string;
  changed_by_agent: boolean;
  created_at: string;
}

export interface ResourceStats {
  total: number;
  online: number;
  offline: number;
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export interface QuotaUsage {
  quota: ContractResourceQuota;
  usage: {
    computers: QuotaUsageItem;
    printers: QuotaUsageItem;
    monitors: QuotaUsageItem;
    servers: QuotaUsageItem;
    windows_licenses: QuotaUsageItem;
    office_licenses: QuotaUsageItem;
    antivirus_licenses: QuotaUsageItem;
  };
  alerts: string[];
}

export interface QuotaUsageItem {
  quota: number;
  used: number;
  available: number;
  percentage: number;
}

// DTOs
export interface CreateResourceDto {
  name: string;
  resource_type: ResourceType;
  client_id: string;
  contract_id?: string;
  resource_group?: string;
  location?: string;
  department?: string;
  status?: ResourceStatus;
  assigned_user_name?: string;
  assigned_user_email?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  asset_tag?: string;
  purchase_date?: string;
  warranty_expiry_date?: string;
  os_name?: string;
  os_version?: string;
  ip_address?: string;
  mac_address?: string;
  hostname?: string;
  specifications?: Record<string, any>;
  custom_fields?: Record<string, any>;
  notes?: string;
  image_url?: string;
}

export interface UpdateResourceDto extends Partial<CreateResourceDto> {}

export interface QueryResourceDto {
  page?: number;
  perPage?: number;
  client_id?: string;
  contract_id?: string;
  resource_type?: ResourceType;
  status?: ResourceStatus;
  resource_group?: string;
  location?: string;
  department?: string;
  is_online?: boolean;
  search?: string;
}

export interface CreateLicenseDto {
  license_key?: string;
  activation_type?: ActivationType;
  linked_email?: string;
  license_type: LicenseType;
  product_name: string;
  product_version?: string;
  client_id: string;
  contract_id?: string;
  resource_id?: string;
  assigned_to_user?: string;
  license_status?: LicenseStatus;
  purchase_date?: string;
  expiry_date?: string;
  is_perpetual?: boolean;
  duration_type?: DurationType;
  duration_value?: number;
  activation_date?: string;
  max_activations?: number;
  vendor?: string;
  purchase_order?: string;
  cost?: number;
  custom_fields?: Record<string, any>;
  notes?: string;
  notification_email?: string;
  requester_name?: string;
  requester_phone?: string;
}

export interface UpdateLicenseDto extends Partial<CreateLicenseDto> {}

export interface CreateQuotaDto {
  contract_id: string;
  client_id: string;
  computers_quota?: number;
  printers_quota?: number;
  monitors_quota?: number;
  servers_quota?: number;
  windows_licenses_quota?: number;
  office_licenses_quota?: number;
  antivirus_licenses_quota?: number;
  custom_quotas?: Record<string, any>;
  allow_exceed?: boolean;
  alert_threshold?: number;
}

export interface UpdateQuotaDto extends Partial<CreateQuotaDto> {}

// License Statistics
export interface LicenseGeneralStats {
  total: number;
  available: number;
  assigned: number;
  expired: number;
  suspended: number;
  perpetual: number;
  expiringSoon: number;
  byType: Record<string, number>;
  totalCost: number;
}

// License History
export enum LicenseHistoryEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  EXPIRED = 'expired',
  RENEWED = 'renewed',
  SUSPENDED = 'suspended',
  REACTIVATED = 'reactivated',
}

export interface LicenseHistoryEntry {
  id: string;
  license_id: string;
  event_type: LicenseHistoryEventType;
  event_description?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  resource_id?: string;
  resource?: Resource;
  changed_by_user_id?: string;
  is_automatic: boolean;
  ip_address?: string;
  created_at: string;
}

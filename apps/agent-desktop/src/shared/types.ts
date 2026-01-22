export interface AgentConfig {
  agentId: string | null;
  agentToken: string | null;
  resourceId: string | null;
  resourceCode: string | null;
  clientId: string | null;
  clientName: string | null;
  contractId: string | null;
  apiUrl: string;
  configured: boolean;
}

export interface SystemInfo {
  os: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
    hostname: string;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disks: Array<{
    name: string;
    type: string;
    size: number;
    used: number;
  }>;
  network: {
    interfaces: Array<{
      name: string;
      ip4: string;
      mac: string;
    }>;
  };
  antivirus?: {
    name: string;
    enabled: boolean;
    upToDate: boolean;
  };
}

export interface HeartbeatData {
  agentId: string;
  timestamp: string;
  quickStatus: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

export interface RegistrationData {
  clientId: string;
  contractId?: string;
  machineName: string;
  location?: string;
  department?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  systemInfo: SystemInfo;
}

export interface RegistrationResponse {
  agentId: string;
  agentToken: string;
  resourceId: string;
  resourceCode: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

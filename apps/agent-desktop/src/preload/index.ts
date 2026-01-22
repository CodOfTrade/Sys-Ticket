import { contextBridge, ipcRenderer } from 'electron';
import { AgentConfig, RegistrationData, SystemInfo } from '@shared/types';

// Expor APIs para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuração
  getConfig: (): Promise<AgentConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AgentConfig): Promise<boolean> =>
    ipcRenderer.invoke('save-config', config),

  // Registro
  registerAgent: (data: RegistrationData) =>
    ipcRenderer.invoke('register-agent', data),

  // Sistema
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('get-system-info'),
  getHostname: (): Promise<string> => ipcRenderer.invoke('get-hostname'),

  // API
  testConnection: (apiUrl: string): Promise<boolean> =>
    ipcRenderer.invoke('test-connection', apiUrl),
  getClients: (): Promise<any[]> => ipcRenderer.invoke('get-clients'),
  getClientContracts: (clientId: string): Promise<any[]> =>
    ipcRenderer.invoke('get-client-contracts', clientId),

  // Navegação
  onNavigate: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate-to', (_, route) => callback(route));
  },
});

// Definir tipo global para TypeScript
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AgentConfig>;
      saveConfig: (config: AgentConfig) => Promise<boolean>;
      registerAgent: (data: RegistrationData) => Promise<any>;
      getSystemInfo: () => Promise<SystemInfo>;
      getHostname: () => Promise<string>;
      testConnection: (apiUrl: string) => Promise<boolean>;
      getClients: () => Promise<any[]>;
      getClientContracts: (clientId: string) => Promise<any[]>;
      onNavigate: (callback: (route: string) => void) => void;
    };
  }
}

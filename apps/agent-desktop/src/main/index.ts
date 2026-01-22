import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { StorageService } from './services/StorageService';
import { ApiService } from './services/ApiService';
import { SystemInfoService } from './services/SystemInfo';
import { HeartbeatService } from './services/HeartbeatService';

// Variáveis globais
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storageService: StorageService;
let apiService: ApiService;
let systemInfoService: SystemInfoService;
let heartbeatService: HeartbeatService | null = null;

// Constantes
const isDev = process.env.NODE_ENV === 'development';
const RENDERER_URL = isDev
  ? 'http://localhost:5173'
  : `file://${path.join(__dirname, '../renderer/index.html')}`;

/**
 * Cria a janela principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(RENDERER_URL);

  mainWindow.on('ready-to-show', () => {
    const config = storageService.loadConfig();

    // Se não está configurado, mostrar janela de setup
    if (!config.configured) {
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (event) => {
    // Não fechar, apenas minimizar para tray
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Cria ícone na bandeja do sistema
 */
function createTray() {
  const iconPath = path.join(__dirname, '../../build/icon.ico');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  updateTrayMenu();

  tray.setToolTip('Sys-Ticket Agent');

  tray.on('click', () => {
    mainWindow?.show();
  });
}

/**
 * Atualiza menu do tray
 */
function updateTrayMenu() {
  const config = storageService.loadConfig();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Sys-Ticket Agent',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: config.configured ? `Recurso: ${config.resourceCode}` : 'Não configurado',
      enabled: false,
    },
    {
      label: heartbeatService?.isRunning() ? '🟢 Online' : '🔴 Offline',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Abrir Ticket de Suporte',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-to', '/create-ticket');
      },
      enabled: config.configured,
    },
    {
      label: 'Meus Tickets',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-to', '/tickets');
      },
      enabled: config.configured,
    },
    { type: 'separator' },
    {
      label: 'Status do Sistema',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-to', '/status');
      },
      enabled: config.configured,
    },
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-to', '/settings');
      },
    },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);
}

/**
 * Inicializa serviços
 */
function initializeServices() {
  storageService = new StorageService();
  const config = storageService.loadConfig();

  apiService = new ApiService(config.apiUrl);
  systemInfoService = new SystemInfoService();

  // Se está configurado, iniciar heartbeat
  if (config.configured && config.agentId && config.agentToken) {
    apiService.setAgentToken(config.agentToken);
    heartbeatService = new HeartbeatService(
      apiService,
      systemInfoService,
      config.agentId
    );
    heartbeatService.start();
  }
}

/**
 * Registra handlers IPC
 */
function registerIpcHandlers() {
  // Obter configuração
  ipcMain.handle('get-config', () => {
    return storageService.loadConfig();
  });

  // Salvar configuração
  ipcMain.handle('save-config', (_, config) => {
    storageService.saveConfig(config);
    updateTrayMenu();
    return true;
  });

  // Registrar agente
  ipcMain.handle('register-agent', async (_, registrationData) => {
    try {
      const response = await apiService.registerAgent(registrationData);

      // Salvar configuração
      const config = storageService.loadConfig();
      config.agentId = response.agentId;
      config.agentToken = response.agentToken;
      config.resourceId = response.resourceId;
      config.resourceCode = response.resourceCode;
      config.clientId = registrationData.clientId;
      config.contractId = registrationData.contractId;
      config.configured = true;

      storageService.saveConfig(config);

      // Iniciar heartbeat
      if (heartbeatService) {
        heartbeatService.stop();
      }
      heartbeatService = new HeartbeatService(
        apiService,
        systemInfoService,
        response.agentId
      );
      heartbeatService.start();

      updateTrayMenu();

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao registrar agente');
    }
  });

  // Coletar informações do sistema
  ipcMain.handle('get-system-info', async () => {
    return await systemInfoService.collectFullSystemInfo();
  });

  // Obter hostname
  ipcMain.handle('get-hostname', async () => {
    return await systemInfoService.getHostname();
  });

  // Testar conexão com API
  ipcMain.handle('test-connection', async (_, apiUrl) => {
    const testApi = new ApiService(apiUrl);
    return await testApi.testConnection();
  });

  // Buscar clientes
  ipcMain.handle('get-clients', async () => {
    return await apiService.getClients();
  });

  // Buscar contratos de um cliente
  ipcMain.handle('get-client-contracts', async (_, clientId) => {
    return await apiService.getClientContracts(clientId);
  });
}

// Evento: App pronto
app.whenReady().then(() => {
  initializeServices();
  createWindow();
  createTray();
  registerIpcHandlers();
});

// Evento: Todas as janelas fechadas
app.on('window-all-closed', () => {
  // No Windows, não sair do app, apenas minimizar para tray
  if (process.platform !== 'darwin') {
    // Não fazer nada, manter app rodando
  }
});

// Evento: App sendo fechado
app.on('before-quit', () => {
  if (heartbeatService) {
    heartbeatService.stop();
  }
});

// Evento: Ativar app
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

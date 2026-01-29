import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, Notification } from 'electron';
import path from 'path';
import { execSync } from 'child_process';
import { StorageService } from './services/StorageService';
import { ApiService } from './services/ApiService';
import { SystemInfoService } from './services/SystemInfo';
import { HeartbeatService, CommandHandler } from './services/HeartbeatService';

// Variáveis globais
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storageService: StorageService;
let apiService: ApiService;
let systemInfoService: SystemInfoService;
let heartbeatService: HeartbeatService | null = null;
let isQuitting = false;

// Constantes
const isDev = !app.isPackaged;

/**
 * Handler de comandos remotos
 */
const handleRemoteCommand: CommandHandler = async (command: string) => {
  console.log(`Executando comando remoto: ${command}`);

  switch (command) {
    case 'uninstall':
      return await handleUninstallCommand();

    case 'restart':
      return await handleRestartCommand();

    case 'update':
      return { success: false, message: 'Comando de atualização ainda não implementado' };

    case 'collect_info':
      return await handleCollectInfoCommand();

    default:
      return { success: false, message: `Comando desconhecido: ${command}` };
  }
};

/**
 * Comando: Desinstalar agente
 */
async function handleUninstallCommand(): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('Iniciando desinstalação remota...');

    // Parar heartbeat
    if (heartbeatService) {
      heartbeatService.stop();
    }

    // Limpar configuração
    const emptyConfig = {
      apiUrl: storageService.loadConfig().apiUrl,
      configured: false,
    };
    storageService.saveConfig(emptyConfig);

    // Mostrar notificação
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Sys-Ticket Agent',
        body: 'O agente foi desinstalado remotamente. A aplicação será fechada.',
      });
      notification.show();
    }

    // Se instalado via NSIS, executar uninstaller
    if (!isDev && process.platform === 'win32') {
      try {
        const uninstallerPath = path.join(
          process.env.LOCALAPPDATA || '',
          'Programs',
          'sys-ticket-agent',
          'Uninstall Sys-Ticket Agent.exe',
        );

        // Executar desinstalador silenciosamente em background
        execSync(`start "" /B "${uninstallerPath}" /S`, {
          shell: 'cmd.exe',
          stdio: 'ignore',
        });
      } catch (uninstallError) {
        console.error('Erro ao executar desinstalador:', uninstallError);
        // Se não encontrar o uninstaller, apenas fechar o app
      }
    }

    // Aguardar um pouco antes de fechar
    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 2000);

    return { success: true, message: 'Desinstalação iniciada' };
  } catch (error: any) {
    console.error('Erro na desinstalação:', error);
    return { success: false, message: error.message || 'Erro na desinstalação' };
  }
}

/**
 * Comando: Reiniciar agente
 */
async function handleRestartCommand(): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('Reiniciando agente...');

    // Usar app.relaunch() para reiniciar
    app.relaunch();

    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 1000);

    return { success: true, message: 'Agente será reiniciado' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Erro ao reiniciar' };
  }
}

/**
 * Comando: Coletar informações do sistema
 */
async function handleCollectInfoCommand(): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('Coletando informações do sistema...');

    const config = storageService.loadConfig();
    if (!config.agentId) {
      return { success: false, message: 'Agente não configurado' };
    }

    const systemInfo = await systemInfoService.collectFullSystemInfo();
    await apiService.updateInventory(config.agentId, systemInfo);

    return { success: true, message: 'Informações coletadas e enviadas' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Erro ao coletar informações' };
  }
}

function getRendererPath() {
  if (isDev) {
    return 'http://localhost:5173';
  }
  // Em produção, o index.html está em dist/
  // __dirname em produção aponta para resources/app.asar/dist-electron/main
  // então precisamos voltar 2 níveis e entrar em dist/
  return `file://${path.resolve(__dirname, '../../dist/index.html')}`;
}

const RENDERER_URL = getRendererPath();

/**
 * Mostra e maximiza a janela principal
 */
function showAndMaximize() {
  mainWindow?.show();
  mainWindow?.maximize();
}

/**
 * Cria a janela principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    // icon will use Electron default icon
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log('Loading renderer from:', RENDERER_URL);
  console.log('__dirname:', __dirname);
  console.log('app.isPackaged:', app.isPackaged);

  mainWindow.loadURL(RENDERER_URL);

  // Open DevTools apenas em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('ready-to-show', () => {
    const config = storageService.loadConfig();

    // Se não está configurado, mostrar janela de setup
    if (!config.configured) {
      showAndMaximize();
    }
  });

  mainWindow.on('close', (event) => {
    // Não fechar, apenas minimizar para tray
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

/**
 * Cria ícone na bandeja do sistema
 */
function createTray() {
  // Use app icon with base64 encoded PNG (16x16 blue/purple icon)
  const appIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE3SURBVDiNpZKxSsNQFIa/m7RaFRycFBfdXESHDk4K4gtIN+ni4CM4+AYOvoGDg4OIi5M4iIuDQ4cODjoodRIRqV5J7k0uDWlTqxf84Z/OuX/Od84PF1QqlUqRSCQqhmFULMsqaa2lUIxlWdI0TXU8Hs9UKpW7v4FerzcDqAFzwAxgAgLoBnaBp0KhcPnlwXa7fQWsf8KyiqLoJo7jKI7jOI7jbDqOszk3NzcDZNPp9N1fwN8ul0sp5aYQ4lxKeQ5sABvAtZTyzLIsvQ+c7PP5/KXv+y/7+/sXUsoT4Gh3d/cRmB4MBo/ABrAAzAPzwCKwBKwATaABXACP7Xb7bWxgEASPvV5vHzgEVoA1oA48AE/ADbAN1D4P2LZt0zTN0+FweJI2kE6nk0TRaHTiuu6pYRi1sbFpmqbruu7/wB+gXXLuUa2gUwAAAABJRU5ErkJggg=='
  );

  tray = new Tray(appIcon);

  updateTrayMenu();

  tray.setToolTip('Sys-Ticket Agent');

  tray.on('click', () => {
    showAndMaximize();
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
        showAndMaximize();
        mainWindow?.webContents.send('navigate-to', '/create-ticket');
      },
      enabled: config.configured,
    },
    {
      label: 'Meus Tickets',
      click: () => {
        showAndMaximize();
        mainWindow?.webContents.send('navigate-to', '/tickets');
      },
      enabled: config.configured,
    },
    { type: 'separator' },
    {
      label: 'Status do Sistema',
      click: () => {
        showAndMaximize();
        mainWindow?.webContents.send('navigate-to', '/status');
      },
      enabled: config.configured,
    },
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => {
        showAndMaximize();
        mainWindow?.webContents.send('navigate-to', '/settings');
      },
    },
    {
      label: 'Sair',
      click: () => {
        isQuitting = true;
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
    heartbeatService.setCommandHandler(handleRemoteCommand);
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
      config.clientName = registrationData.clientName;
      config.contractId = registrationData.contractId;
      config.configured = true;
      // Salvar dados da máquina
      config.machineName = registrationData.machineName;
      config.location = registrationData.location;
      config.department = registrationData.department;
      config.assignedUserName = registrationData.assignedUserName;
      config.assignedUserEmail = registrationData.assignedUserEmail;
      config.assignedUserPhone = registrationData.assignedUserPhone;

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
      heartbeatService.setCommandHandler(handleRemoteCommand);
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

  // Obter versão do app
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
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

  // Buscar clientes via search
  ipcMain.handle('search-clients', async (_, searchTerm: string) => {
    try {
      if (!apiService) {
        console.error('ApiService não inicializado');
        return [];
      }
      return await apiService.searchClients(searchTerm);
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  });

  // Buscar contratos de um cliente
  ipcMain.handle('get-client-contracts', async (_, clientId) => {
    return await apiService.getClientContracts(clientId);
  });

  // Criar ticket
  ipcMain.handle('create-ticket', async (_, ticketData) => {
    try {
      const config = storageService.loadConfig();
      const systemInfo = await systemInfoService.collectFullSystemInfo();

      const response = await apiService.createTicket({
        agentId: config.agentId!,
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        hasScreenshot: false,
        systemInfo,
      });

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar ticket');
    }
  });

  // Buscar tickets
  ipcMain.handle('get-tickets', async (_, agentId) => {
    try {
      const tickets = await apiService.getTickets(agentId);
      return tickets;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar tickets');
    }
  });
}

// Ignore certificate errors (for development with self-signed certificates)
app.commandLine.appendSwitch('ignore-certificate-errors');

// Handle certificate errors
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // Allow all certificates in development (self-signed, expired, etc)
  event.preventDefault();
  callback(true);
});

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

export enum RemoteCommand {
  UNINSTALL = 'uninstall',
  RESTART = 'restart',
  UPDATE = 'update',
  COLLECT_INFO = 'collect_info',
}

// Timeout de 1 hora para comandos pendentes
export const COMMAND_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora
export const COMMAND_TIMEOUT_MINUTES = 60;

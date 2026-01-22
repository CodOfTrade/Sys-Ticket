import si from 'systeminformation';
import { SystemInfo } from '@shared/types';

export class SystemInfoService {
  /**
   * Coleta informações completas do sistema
   */
  async collectFullSystemInfo(): Promise<SystemInfo> {
    const [osInfo, cpuInfo, memInfo, diskInfo, networkInfo] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkInterfaces(),
    ]);

    // Tentar coletar informações do antivírus (apenas Windows)
    let antivirusInfo = undefined;
    if (process.platform === 'win32') {
      try {
        // TODO: Implementar detecção de antivírus via WMI
        // Por enquanto, deixar undefined
      } catch (error) {
        console.error('Erro ao coletar informações do antivírus:', error);
      }
    }

    return {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
      },
      cpu: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        cores: cpuInfo.cores,
        speed: cpuInfo.speed,
      },
      memory: {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
      },
      disks: diskInfo.map((disk) => ({
        name: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
      })),
      network: {
        interfaces: networkInfo
          .filter((iface) => iface.ip4 && !iface.internal)
          .map((iface) => ({
            name: iface.iface,
            ip4: iface.ip4,
            mac: iface.mac,
          })),
      },
      antivirus: antivirusInfo,
    };
  }

  /**
   * Coleta status rápido para heartbeat
   */
  async collectQuickStatus() {
    const [cpuLoad, memInfo, timeInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.time(),
    ]);

    return {
      cpuUsage: Math.round(cpuLoad.currentLoad),
      memoryUsage: Math.round((memInfo.used / memInfo.total) * 100),
      uptime: timeInfo.uptime,
    };
  }

  /**
   * Captura screenshot da tela principal
   */
  async captureScreenshot(): Promise<Buffer | null> {
    // TODO: Implementar captura de screenshot
    // Usar biblioteca como screenshot-desktop ou similar
    console.log('Screenshot não implementado ainda');
    return null;
  }

  /**
   * Obtém ID único da máquina
   */
  async getMachineId(): Promise<string> {
    const { machineId } = await import('node-machine-id');
    return machineId();
  }

  /**
   * Obtém hostname da máquina
   */
  async getHostname(): Promise<string> {
    const osInfo = await si.osInfo();
    return osInfo.hostname;
  }

  /**
   * Obtém endereço IP principal
   */
  async getPrimaryIpAddress(): Promise<string | null> {
    const networkInfo = await si.networkInterfaces();
    const primaryInterface = networkInfo.find(
      (iface) => iface.ip4 && !iface.internal && iface.default
    );
    return primaryInterface?.ip4 || null;
  }

  /**
   * Obtém endereço MAC principal
   */
  async getPrimaryMacAddress(): Promise<string | null> {
    const networkInfo = await si.networkInterfaces();
    const primaryInterface = networkInfo.find(
      (iface) => iface.mac && !iface.internal && iface.default
    );
    return primaryInterface?.mac || null;
  }
}

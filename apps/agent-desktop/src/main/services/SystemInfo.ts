import si from 'systeminformation';
import { execSync } from 'child_process';
import { SystemInfo } from '@shared/types';

interface AntivirusInfo {
  name: string;
  enabled: boolean;
  upToDate: boolean;
}

export class SystemInfoService {
  /**
   * Detecta antivírus instalado via Windows Security Center (WMI)
   * Funciona no Windows 10/11 com Windows Defender e antivírus de terceiros
   */
  private async getAntivirusInfo(): Promise<AntivirusInfo | undefined> {
    if (process.platform !== 'win32') {
      return undefined;
    }

    try {
      // Query WMI para produtos antivírus registrados no Security Center
      const psScript = `
        $avProducts = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue
        if ($avProducts) {
          $av = $avProducts | Select-Object -First 1
          @{
            displayName = $av.displayName
            productState = $av.productState
          } | ConvertTo-Json -Compress
        } else {
          @{ displayName = $null; productState = 0 } | ConvertTo-Json -Compress
        }
      `.replace(/\n/g, ' ');

      const result = execSync(
        `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        { encoding: 'utf8', timeout: 15000 }
      );

      const avInfo = JSON.parse(result.trim());

      if (!avInfo.displayName) {
        // Fallback: tentar detectar Windows Defender diretamente
        return this.getWindowsDefenderStatus();
      }

      // Decodificar productState (bitmap do Windows Security Center)
      // Bit 12 (0x1000): Proteção em tempo real ativa
      // Bit 4 (0x10): Definições desatualizadas
      const state = avInfo.productState || 0;
      const enabled = (state & 0x1000) !== 0;
      const upToDate = (state & 0x10) === 0;

      return {
        name: avInfo.displayName,
        enabled,
        upToDate,
      };
    } catch (error) {
      console.error('Erro ao detectar antivírus via SecurityCenter2:', error);
      // Tentar fallback para Windows Defender
      return this.getWindowsDefenderStatus();
    }
  }

  /**
   * Fallback: detectar status do Windows Defender diretamente
   */
  private async getWindowsDefenderStatus(): Promise<AntivirusInfo | undefined> {
    try {
      const psScript = `
        $status = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if ($status) {
          @{
            name = 'Windows Defender'
            enabled = $status.RealTimeProtectionEnabled
            upToDate = $status.AntivirusSignatureLastUpdated -gt (Get-Date).AddDays(-7)
          } | ConvertTo-Json -Compress
        } else {
          $null
        }
      `.replace(/\n/g, ' ');

      const result = execSync(
        `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        { encoding: 'utf8', timeout: 15000 }
      );

      if (result && result.trim() && result.trim() !== 'null') {
        return JSON.parse(result.trim());
      }
    } catch (error) {
      console.error('Erro ao detectar Windows Defender:', error);
    }

    return undefined;
  }

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

    // Coletar informações do antivírus (apenas Windows)
    let antivirusInfo: AntivirusInfo | undefined = undefined;
    if (process.platform === 'win32') {
      try {
        antivirusInfo = await this.getAntivirusInfo();
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

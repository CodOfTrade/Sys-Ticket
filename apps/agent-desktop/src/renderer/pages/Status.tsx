import { useState, useEffect } from 'react';
import { AgentConfig, SystemInfo } from '@shared/types';
import './Status.css';

interface StatusProps {
  config: AgentConfig;
}

export function Status({ config }: StatusProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const info = await window.electronAPI.getSystemInfo();
      setSystemInfo(info);
    } catch (err: any) {
      setError(err.message || 'Erro ao coletar informações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSystemInfo();
    setRefreshing(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getPercentage = (used: number, total: number): number => {
    return Math.round((used / total) * 100);
  };

  if (loading) {
    return (
      <div className="status-page">
        <div className="page-header">
          <h1>Status do Sistema</h1>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Coletando informações do sistema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-page">
        <div className="page-header">
          <h1>Status do Sistema</h1>
        </div>
        <div className="error-box">
          <p>⚠️ {error}</p>
          <button onClick={handleRefresh} className="btn-retry">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return null;
  }

  return (
    <div className="status-page">
      <div className="page-header">
        <div>
          <h1>Status do Sistema</h1>
          <p>Informações detalhadas do inventário</p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-refresh"
          disabled={refreshing}
        >
          {refreshing ? '↻ Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      <div className="status-content">
        {/* Sistema Operacional */}
        <div className="status-card">
          <div className="card-header">
            <span className="card-icon">💻</span>
            <h2>Sistema Operacional</h2>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="label">Distribuição:</span>
              <span className="value">{systemInfo.os.distro}</span>
            </div>
            <div className="info-row">
              <span className="label">Versão:</span>
              <span className="value">{systemInfo.os.release}</span>
            </div>
            <div className="info-row">
              <span className="label">Plataforma:</span>
              <span className="value">{systemInfo.os.platform}</span>
            </div>
            <div className="info-row">
              <span className="label">Arquitetura:</span>
              <span className="value">{systemInfo.os.arch}</span>
            </div>
            <div className="info-row">
              <span className="label">Hostname:</span>
              <span className="value">{systemInfo.os.hostname}</span>
            </div>
          </div>
        </div>

        {/* Processador */}
        <div className="status-card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <h2>Processador</h2>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="label">Fabricante:</span>
              <span className="value">{systemInfo.cpu.manufacturer}</span>
            </div>
            <div className="info-row">
              <span className="label">Modelo:</span>
              <span className="value">{systemInfo.cpu.brand}</span>
            </div>
            <div className="info-row">
              <span className="label">Núcleos:</span>
              <span className="value">{systemInfo.cpu.cores} cores</span>
            </div>
            <div className="info-row">
              <span className="label">Velocidade:</span>
              <span className="value">{systemInfo.cpu.speed} GHz</span>
            </div>
          </div>
        </div>

        {/* Memória */}
        <div className="status-card">
          <div className="card-header">
            <span className="card-icon">🧠</span>
            <h2>Memória RAM</h2>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="label">Total:</span>
              <span className="value">{formatBytes(systemInfo.memory.total)}</span>
            </div>
            <div className="info-row">
              <span className="label">Usada:</span>
              <span className="value">{formatBytes(systemInfo.memory.used)}</span>
            </div>
            <div className="info-row">
              <span className="label">Livre:</span>
              <span className="value">{formatBytes(systemInfo.memory.free)}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${getPercentage(systemInfo.memory.used, systemInfo.memory.total)}%`,
                }}
              ></div>
            </div>
            <div className="progress-label">
              {getPercentage(systemInfo.memory.used, systemInfo.memory.total)}% em uso
            </div>
          </div>
        </div>

        {/* Discos */}
        <div className="status-card full-width">
          <div className="card-header">
            <span className="card-icon">💾</span>
            <h2>Discos</h2>
          </div>
          <div className="card-body">
            <div className="disks-grid">
              {systemInfo.disks.map((disk, index) => (
                <div key={index} className="disk-item">
                  <div className="disk-header">
                    <strong>{disk.name}</strong>
                    <span className="disk-type">{disk.type}</span>
                  </div>
                  <div className="disk-info">
                    <span>Total: {formatBytes(disk.size)}</span>
                    <span>Usado: {formatBytes(disk.used)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getPercentage(disk.used, disk.size)}%` }}
                    ></div>
                  </div>
                  <div className="progress-label">
                    {getPercentage(disk.used, disk.size)}% em uso
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rede */}
        <div className="status-card full-width">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <h2>Interfaces de Rede</h2>
          </div>
          <div className="card-body">
            {systemInfo.network.interfaces.length === 0 ? (
              <p className="no-data">Nenhuma interface de rede encontrada</p>
            ) : (
              <div className="network-grid">
                {systemInfo.network.interfaces.map((iface, index) => (
                  <div key={index} className="network-item">
                    <div className="network-header">{iface.name}</div>
                    <div className="info-row">
                      <span className="label">IP:</span>
                      <span className="value">{iface.ip4}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">MAC:</span>
                      <span className="value">{iface.mac}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Heartbeat Info */}
        <div className="status-card">
          <div className="card-header">
            <span className="card-icon">💓</span>
            <h2>Monitoramento</h2>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="label">Status:</span>
              <span className="value status-online">● Online</span>
            </div>
            <div className="info-row">
              <span className="label">Intervalo:</span>
              <span className="value">5 minutos</span>
            </div>
            <div className="info-row">
              <span className="label">Resource Code:</span>
              <span className="value">{config.resourceCode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

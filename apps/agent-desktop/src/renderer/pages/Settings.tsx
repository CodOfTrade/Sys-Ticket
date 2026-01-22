import { useState, useEffect } from 'react';
import { AgentConfig } from '@shared/types';
import './Settings.css';

interface SettingsProps {
  config: AgentConfig;
  onUpdate: () => void;
}

export function Settings({ config, onUpdate }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estados editáveis
  const [machineName, setMachineName] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('');
  const [assignedUserEmail, setAssignedUserEmail] = useState('');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    // Carregar valores atuais
    setApiUrl(config.apiUrl || 'https://172.31.255.26/api');
    setMachineName(config.machineName || '');
    setLocation(config.location || '');
    setDepartment(config.department || '');
    setAssignedUserName(config.assignedUserName || '');
    setAssignedUserEmail(config.assignedUserEmail || '');
  }, [config]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Atualizar config local
      const updatedConfig: AgentConfig = {
        ...config,
        apiUrl,
        machineName,
        location,
        department,
        assignedUserName,
        assignedUserEmail,
      };

      await window.electronAPI.saveConfig(updatedConfig);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onUpdate(); // Recarregar config no App
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie as configurações do agente</p>
      </div>

      <div className="settings-content">
        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            ✓ Configurações salvas com sucesso!
          </div>
        )}

        <div className="settings-section">
          <h2>Informações do Recurso</h2>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Código do Recurso</label>
              <input
                type="text"
                value={config.resourceCode || 'N/A'}
                disabled
                className="input-disabled"
              />
              <small>Gerado automaticamente no registro</small>
            </div>

            <div className="setting-item">
              <label>ID do Agente</label>
              <input
                type="text"
                value={config.agentId || 'N/A'}
                disabled
                className="input-disabled"
              />
              <small>ID único do agente no sistema</small>
            </div>

            <div className="setting-item">
              <label>Cliente</label>
              <input
                type="text"
                value={config.clientName || config.clientId || 'N/A'}
                disabled
                className="input-disabled"
              />
              <small>Cliente associado ao agente</small>
            </div>

            {config.contractId && (
              <div className="setting-item">
                <label>Contrato ID</label>
                <input
                  type="text"
                  value={config.contractId}
                  disabled
                  className="input-disabled"
                />
                <small>Contrato vinculado</small>
              </div>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h2>Configurações da Máquina</h2>
          <p className="section-description">
            Configure as informações desta máquina
          </p>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Nome da Máquina</label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="Ex: DESKTOP-001"
                disabled={loading}
              />
            </div>

            <div className="setting-item">
              <label>Localização</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Matriz - Sala 10"
                disabled={loading}
              />
            </div>

            <div className="setting-item">
              <label>Departamento</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: TI"
                disabled={loading}
              />
            </div>

            <div className="setting-item">
              <label>Usuário Responsável</label>
              <input
                type="text"
                value={assignedUserName}
                onChange={(e) => setAssignedUserName(e.target.value)}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="setting-item">
              <label>Email do Responsável</label>
              <input
                type="email"
                value={assignedUserEmail}
                onChange={(e) => setAssignedUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Conexão</h2>
          <div className="settings-grid">
            <div className="setting-item full-width">
              <label>URL da API</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://172.31.255.26/api"
                disabled={loading}
              />
              <small>Endereço do servidor Sys-Ticket</small>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="btn-secondary"
            onClick={() => window.history.back()}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        <div className="settings-info">
          <p>
            <strong>Nota:</strong> Alterações nas configurações de conexão requerem reinicialização do agente para entrar em vigor.
          </p>
        </div>
      </div>
    </div>
  );
}

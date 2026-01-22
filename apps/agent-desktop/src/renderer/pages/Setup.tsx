import { useState, useEffect } from 'react';
import { RegistrationData, SystemInfo } from '@shared/types';
import './Setup.css';

interface SetupProps {
  onComplete: () => void;
}

export function Setup({ onComplete }: SetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Dados básicos
  const [apiUrl, setApiUrl] = useState('https://172.31.255.26/api');
  const [connectionTested, setConnectionTested] = useState(false);

  // Step 2: Cliente e Contrato
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');

  // Step 3: Informações da máquina
  const [machineName, setMachineName] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('');
  const [assignedUserEmail, setAssignedUserEmail] = useState('');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const hostname = await window.electronAPI.getHostname();
      setMachineName(hostname);
    } catch (error) {
      console.error('Erro ao carregar hostname:', error);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await window.electronAPI.testConnection(apiUrl);
      if (success) {
        setConnectionTested(true);
        alert('Conexão estabelecida com sucesso!');
      } else {
        setError('Não foi possível conectar ao servidor. Verifique a URL.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao testar conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleNextToStep2 = async () => {
    if (!connectionTested) {
      setError('Por favor, teste a conexão primeiro');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientsList = await window.electronAPI.getClients();
      setClients(clientsList);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedContractId('');

    if (clientId) {
      setLoading(true);
      try {
        const contractsList = await window.electronAPI.getClientContracts(clientId);
        setContracts(contractsList);
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar contratos');
      } finally {
        setLoading(false);
      }
    } else {
      setContracts([]);
    }
  };

  const handleNextToStep3 = async () => {
    if (!selectedClientId) {
      setError('Selecione um cliente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await window.electronAPI.getSystemInfo();
      setSystemInfo(info);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Erro ao coletar informações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!machineName) {
      setError('Nome da máquina é obrigatório');
      return;
    }

    if (!systemInfo) {
      setError('Informações do sistema não foram coletadas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registrationData: RegistrationData = {
        clientId: selectedClientId,
        contractId: selectedContractId || undefined,
        machineName,
        location: location || undefined,
        department: department || undefined,
        assignedUserName: assignedUserName || undefined,
        assignedUserEmail: assignedUserEmail || undefined,
        systemInfo,
      };

      await window.electronAPI.registerAgent(registrationData);
      alert('Agente registrado com sucesso!');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar agente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h1>🎫 Sys-Ticket Agent</h1>
        <p>Configuração Inicial</p>
      </div>

      <div className="setup-content">
        <div className="setup-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span>1</span> Conexão
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span>2</span> Cliente
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span> Máquina
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Conexão */}
        {step === 1 && (
          <div className="step-content">
            <h2>Conexão com o Servidor</h2>
            <div className="form-group">
              <label>URL da API</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setConnectionTested(false);
                }}
                placeholder="https://172.31.255.26/api"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleTestConnection}
              disabled={loading || !apiUrl}
              className="btn-secondary"
            >
              {loading ? 'Testando...' : 'Testar Conexão'}
            </button>
            {connectionTested && <div className="success-message">✓ Conexão OK</div>}
            <div className="step-actions">
              <button
                onClick={handleNextToStep2}
                disabled={loading || !connectionTested}
                className="btn-primary"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Cliente/Contrato */}
        {step === 2 && (
          <div className="step-content">
            <h2>Selecione o Cliente</h2>
            <div className="form-group">
              <label>Cliente *</label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.sige_id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Contrato (Opcional)</label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                disabled={loading || !selectedClientId || contracts.length === 0}
              >
                <option value="">Nenhum contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.sige_id}>
                    {contract.description || contract.sige_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="step-actions">
              <button onClick={() => setStep(1)} className="btn-secondary">
                ← Voltar
              </button>
              <button
                onClick={handleNextToStep3}
                disabled={loading || !selectedClientId}
                className="btn-primary"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Informações da Máquina */}
        {step === 3 && (
          <div className="step-content">
            <h2>Informações da Máquina</h2>
            <div className="form-group">
              <label>Nome da Máquina *</label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Localização</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Matriz - Sala 10"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: TI"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Usuário Responsável</label>
              <input
                type="text"
                value={assignedUserName}
                onChange={(e) => setAssignedUserName(e.target.value)}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email do Responsável</label>
              <input
                type="email"
                value={assignedUserEmail}
                onChange={(e) => setAssignedUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={loading}
              />
            </div>

            {systemInfo && (
              <div className="system-info-summary">
                <h3>Informações Coletadas:</h3>
                <ul>
                  <li><strong>SO:</strong> {systemInfo.os.distro} {systemInfo.os.release}</li>
                  <li><strong>CPU:</strong> {systemInfo.cpu.brand}</li>
                  <li><strong>RAM:</strong> {Math.round(systemInfo.memory.total / 1024 / 1024 / 1024)} GB</li>
                  <li><strong>Hostname:</strong> {systemInfo.os.hostname}</li>
                </ul>
              </div>
            )}

            <div className="step-actions">
              <button onClick={() => setStep(2)} className="btn-secondary" disabled={loading}>
                ← Voltar
              </button>
              <button
                onClick={handleRegister}
                disabled={loading || !machineName}
                className="btn-primary"
              >
                {loading ? 'Registrando...' : 'Concluir Registro'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

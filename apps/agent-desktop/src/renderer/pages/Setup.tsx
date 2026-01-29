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
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Step 3: Informações da máquina
  const [machineName, setMachineName] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('');
  const [assignedUserEmail, setAssignedUserEmail] = useState('');
  const [assignedUserPhone, setAssignedUserPhone] = useState('');
  const [resourceCode, setResourceCode] = useState('');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Buscar clientes via API backend (sem limite frontend)
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.trim().length < 2) {
        setSearchResults([]);
        setShowClientDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await window.electronAPI.searchClients(clientSearch.trim());
        console.log('Resultados da busca:', results);
        setSearchResults(results);
        setShowClientDropdown(results.length > 0);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce: 300ms para evitar muitas requisições
    const timeoutId = setTimeout(searchClients, 300);
    return () => clearTimeout(timeoutId);
  }, [clientSearch]);

  const loadInitialData = async () => {
    try {
      const hostname = await window.electronAPI.getHostname();
      setMachineName(hostname);

      // Carregar versão do app
      const version = await window.electronAPI.getAppVersion();
      setAppVersion(version);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
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

    setError(null);
    setStep(2);
  };

  const handleSelectClient = async (client: any) => {
    setClientSearch(client.nome || client.name || client.razao_social);
    setShowClientDropdown(false);
    setSelectedClientId(client.id);
    setSelectedClientName(client.nome_fantasia || client.nome || client.name || client.razao_social || '');
    setSelectedContractId('');

    // Buscar contratos do cliente selecionado
    if (client.id) {
      setLoading(true);
      try {
        const contractsList = await window.electronAPI.getClientContracts(client.id);
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

  const handleClearClient = () => {
    setClientSearch('');
    setSelectedClientId('');
    setSelectedClientName('');
    setSelectedContractId('');
    setContracts([]);
    setShowClientDropdown(false);
  };

  const handleNextToStep3 = async () => {
    if (!selectedClientId) {
      setError('Selecione um cliente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Coletando informações do sistema...');
      const info = await window.electronAPI.getSystemInfo();
      console.log('Informações coletadas:', info);
      setSystemInfo(info);
      setLoading(false); // Garantir que loading seja false ANTES de mudar step
      setStep(3);
    } catch (err: any) {
      console.error('Erro ao coletar informações:', err);
      setError(err.message || 'Erro ao coletar informações do sistema');
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
        clientName: selectedClientName,
        contractId: selectedContractId || undefined,
        machineName,
        location: location || undefined,
        department: department || undefined,
        assignedUserName: assignedUserName || undefined,
        assignedUserEmail: assignedUserEmail || undefined,
        assignedUserPhone: assignedUserPhone || undefined,
        resourceCode: resourceCode || undefined,
        agentVersion: appVersion,
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
              <div className="autocomplete-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log('Campo cliente onChange:', newValue);
                    setClientSearch(newValue);
                    setShowClientDropdown(true);
                    // Se está limpando, resetar seleção
                    if (newValue === '') {
                      setSelectedClientId('');
                      setSelectedClientName('');
                    }
                  }}
                  onFocus={() => {
                    console.log('Campo cliente focado');
                    setShowClientDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    console.log('Tecla pressionada:', e.key);
                  }}
                  placeholder="Digite para buscar cliente..."
                  autoComplete="off"
                  style={{ flex: 1, pointerEvents: 'auto' }}
                />
                {selectedClientId && (
                  <button
                    type="button"
                    onClick={handleClearClient}
                    style={{
                      padding: '8px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    title="Limpar seleção"
                  >
                    ✕
                  </button>
                )}

                {/* Loading State */}
                {isSearching && clientSearch.length >= 2 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    marginTop: '4px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    Buscando...
                  </div>
                )}

                {/* No Results */}
                {!isSearching && clientSearch.length >= 2 && searchResults.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    marginTop: '4px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    Nenhum cliente encontrado
                  </div>
                )}

                {/* Hint Minimum Characters */}
                {clientSearch.length > 0 && clientSearch.length < 2 && (
                  <small style={{ position: 'absolute', top: '100%', marginTop: '4px', color: '#666', display: 'block' }}>
                    Digite pelo menos 2 caracteres para buscar
                  </small>
                )}

                {showClientDropdown && searchResults.length > 0 && !selectedClientId && (
                  <ul className="autocomplete-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    listStyle: 'none',
                    padding: 0,
                    margin: '4px 0 0 0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    {searchResults.map(client => (
                      <li
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>
                          {client.nome_fantasia || client.nome || client.name || client.razao_social}
                        </div>
                        {client.cpf_cnpj && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                            CNPJ: {client.cpf_cnpj}
                            {client.cidade && ` • ${client.cidade}/${client.estado}`}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedClientId && (
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Selecionado: {selectedClientName}
                </small>
              )}
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
                  <option key={contract.id} value={contract.id}>
                    {contract.descricao || contract.numero_contrato || contract.id}
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
            <div className="form-group">
              <label>Telefone do Responsável</label>
              <input
                type="tel"
                value={assignedUserPhone}
                onChange={(e) => setAssignedUserPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Código do Recurso (Opcional)</label>
              <input
                type="text"
                value={resourceCode}
                onChange={(e) => setResourceCode(e.target.value.toUpperCase())}
                placeholder="Ex: SALA-10-PC-001 (vazio = gerar automaticamente)"
                disabled={loading}
                maxLength={50}
                style={{ fontFamily: 'monospace' }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '13px' }}>
                Deixe vazio para gerar automaticamente (RES-2026-XXXXXX)
              </small>
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

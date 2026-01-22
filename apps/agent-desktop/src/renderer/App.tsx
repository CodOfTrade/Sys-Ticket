import { useEffect, useState } from 'react';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { AgentConfig } from '@shared/types';

function App() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const loadedConfig = await window.electronAPI.getConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigComplete = async () => {
    await loadConfig();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f5f5f5',
      }}>
        <div>
          <h2>Sys-Ticket Agent</h2>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!config?.configured) {
    return <Setup onComplete={handleConfigComplete} />;
  }

  return <Dashboard config={config} />;
}

export default App;

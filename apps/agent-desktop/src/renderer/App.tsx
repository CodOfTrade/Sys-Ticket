import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Status } from './pages/Status';
import { CreateTicket } from './pages/CreateTicket';
import { Tickets } from './pages/Tickets';
import { Layout } from './components/Layout';
import { AgentConfig } from '@shared/types';

function App() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();

    // Listener para navegação via IPC do tray menu
    const unsubscribe = window.electronAPI.onNavigate((path: string) => {
      window.location.hash = path;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

  // Se não está configurado, mostrar apenas o Setup
  if (!config?.configured) {
    return <Setup onComplete={handleConfigComplete} />;
  }

  // Se está configurado, usar rotas normais com Layout
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout config={config}><Dashboard config={config} /></Layout>} />
        <Route path="/dashboard" element={<Layout config={config}><Dashboard config={config} /></Layout>} />
        <Route path="/create-ticket" element={<Layout config={config}><CreateTicket config={config} /></Layout>} />
        <Route path="/tickets" element={<Layout config={config}><Tickets config={config} /></Layout>} />
        <Route path="/status" element={<Layout config={config}><Status config={config} /></Layout>} />
        <Route path="/settings" element={<Layout config={config}><Settings config={config} onUpdate={loadConfig} /></Layout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

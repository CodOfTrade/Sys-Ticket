import { useNavigate } from 'react-router-dom';
import { AgentConfig } from '@shared/types';
import './Dashboard.css';

interface DashboardProps {
  config: AgentConfig;
}

export function Dashboard({ config }: DashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao Sys-Ticket Agent</p>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Status do Agente</h2>
          <p>O agente está rodando em segundo plano e enviando heartbeats para o servidor a cada 5 minutos.</p>
        </div>

        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3>Status</h3>
              <p className="card-value">Monitorando</p>
              <button
                className="card-action"
                onClick={() => navigate('/status')}
              >
                Ver Detalhes →
              </button>
            </div>
          </div>

          <div className="info-card">
            <div className="card-icon">🔄</div>
            <div className="card-content">
              <h3>Heartbeat</h3>
              <p className="card-value">Ativo (5 min)</p>
              <small className="card-hint">Último envio: há poucos minutos</small>
            </div>
          </div>

          <div className="info-card">
            <div className="card-icon">🏢</div>
            <div className="card-content">
              <h3>Cliente</h3>
              <p className="card-value">{config.clientName || 'N/A'}</p>
              <button
                className="card-action"
                onClick={() => navigate('/settings')}
              >
                Configurar →
              </button>
            </div>
          </div>
        </div>

        <div className="actions-section">
          <h3>Ações Rápidas</h3>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => navigate('/create-ticket')}
            >
              <span className="btn-icon">🎫</span>
              <div>
                <strong>Abrir Ticket</strong>
                <small>Criar novo chamado de suporte</small>
              </div>
            </button>
            <button
              className="action-btn"
              onClick={() => navigate('/tickets')}
            >
              <span className="btn-icon">💬</span>
              <div>
                <strong>Meus Tickets</strong>
                <small>Ver tickets abertos</small>
              </div>
            </button>
            <button
              className="action-btn"
              onClick={() => navigate('/status')}
            >
              <span className="btn-icon">⚙️</span>
              <div>
                <strong>Status do Sistema</strong>
                <small>Ver informações detalhadas</small>
              </div>
            </button>
          </div>
        </div>

        <div className="info-section">
          <h3>Informações do Recurso</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Código do Recurso:</label>
              <span className="value">{config.resourceCode}</span>
            </div>
            <div className="info-item">
              <label>ID do Recurso:</label>
              <span className="value">{config.resourceId}</span>
            </div>
            <div className="info-item">
              <label>Cliente ID:</label>
              <span className="value">{config.clientId}</span>
            </div>
            {config.contractId && (
              <div className="info-item">
                <label>Contrato ID:</label>
                <span className="value">{config.contractId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

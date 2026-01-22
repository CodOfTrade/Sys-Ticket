import { AgentConfig } from '@shared/types';
import './Dashboard.css';

interface DashboardProps {
  config: AgentConfig;
}

export function Dashboard({ config }: DashboardProps) {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>🎫 Sys-Ticket Agent</h1>
          <p className="status-online">● Online</p>
        </div>
        <div className="resource-info">
          <span className="resource-code">{config.resourceCode}</span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Bem-vindo ao Sys-Ticket Agent</h2>
          <p>O agente está rodando em segundo plano e enviando heartbeats para o servidor a cada 5 minutos.</p>
        </div>

        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3>Status</h3>
              <p>Monitorando</p>
            </div>
          </div>

          <div className="info-card">
            <div className="card-icon">🔄</div>
            <div className="card-content">
              <h3>Heartbeat</h3>
              <p>Ativo (5 min)</p>
            </div>
          </div>

          <div className="info-card">
            <div className="card-icon">🏢</div>
            <div className="card-content">
              <h3>Cliente</h3>
              <p>{config.clientName || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="actions-section">
          <h3>Ações Rápidas</h3>
          <div className="action-buttons">
            <button className="action-btn" disabled>
              <span className="btn-icon">🎫</span>
              <div>
                <strong>Abrir Ticket</strong>
                <small>Criar novo chamado de suporte</small>
              </div>
            </button>
            <button className="action-btn" disabled>
              <span className="btn-icon">💬</span>
              <div>
                <strong>Meus Tickets</strong>
                <small>Ver tickets abertos</small>
              </div>
            </button>
            <button className="action-btn" disabled>
              <span className="btn-icon">⚙️</span>
              <div>
                <strong>Configurações</strong>
                <small>Ajustar preferências</small>
              </div>
            </button>
          </div>
          <p className="note">
            💡 <strong>Dica:</strong> Você pode acessar todas as funcionalidades através do ícone na bandeja do sistema (system tray).
          </p>
        </div>

        <div className="info-section">
          <h3>Informações do Recurso</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Código do Recurso:</label>
              <value>{config.resourceCode}</value>
            </div>
            <div className="info-item">
              <label>ID do Recurso:</label>
              <value>{config.resourceId}</value>
            </div>
            <div className="info-item">
              <label>Cliente ID:</label>
              <value>{config.clientId}</value>
            </div>
            {config.contractId && (
              <div className="info-item">
                <label>Contrato ID:</label>
                <value>{config.contractId}</value>
              </div>
            )}
          </div>
        </div>

        <div className="footer-note">
          <p>O agente continuará rodando em segundo plano mesmo com esta janela fechada.</p>
          <p>Para sair completamente, use o menu do ícone na bandeja do sistema.</p>
        </div>
      </div>
    </div>
  );
}

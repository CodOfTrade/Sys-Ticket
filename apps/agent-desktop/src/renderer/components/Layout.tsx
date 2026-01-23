import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AgentConfig } from '@shared/types';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  config: AgentConfig;
}

export function Layout({ children, config }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      <div className="layout-sidebar">
        <div className="sidebar-header">
          <h1>🎫 Sys-Ticket</h1>
          <p className="resource-code">{config.resourceCode}</p>
          <p className="status-badge online">● Online</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${isActive('/dashboard') || isActive('/') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${isActive('/tickets') ? 'active' : ''}`}
            onClick={() => navigate('/tickets')}
          >
            <span className="nav-icon">📋</span>
            <span>Meus Tickets</span>
          </button>

          <button
            className={`nav-item ${isActive('/status') ? 'active' : ''}`}
            onClick={() => navigate('/status')}
          >
            <span className="nav-icon">📊</span>
            <span>Status do Sistema</span>
          </button>

          <button
            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span>Configurações</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p className="client-name">{config.clientName || 'Cliente'}</p>
          <p className="app-version">v1.0.0</p>
        </div>
      </div>

      <div className="layout-content">
        {children}
      </div>
    </div>
  );
}

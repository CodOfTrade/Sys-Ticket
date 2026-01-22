import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentConfig } from '@shared/types';
import './Tickets.css';

interface TicketsProps {
  config: AgentConfig;
}

interface Ticket {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  category?: string;
}

export function Tickets({ config: _config }: TicketsProps) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Implementar busca de tickets via API
      // const response = await window.electronAPI.getTickets(config.agentId);
      // setTickets(response);

      // Dados simulados para demonstração
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTickets([
        {
          id: '1',
          code: 'TKT-001',
          title: 'Computador lento',
          status: 'open',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          category: 'Performance',
        },
        {
          id: '2',
          code: 'TKT-002',
          title: 'Impressora não funciona',
          status: 'in_progress',
          priority: 'high',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          category: 'Hardware',
        },
        {
          id: '3',
          code: 'TKT-003',
          title: 'Senha expirada',
          status: 'resolved',
          priority: 'low',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string): string => {
    const classes: Record<string, string> = {
      open: 'status-open',
      in_progress: 'status-progress',
      resolved: 'status-resolved',
      closed: 'status-closed',
    };
    return classes[status] || '';
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  };

  const getPriorityClass = (priority: string): string => {
    const classes: Record<string, string> = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent',
    };
    return classes[priority] || '';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    } else {
      return 'Menos de 1 hora atrás';
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="tickets-page">
        <div className="page-header">
          <h1>Meus Tickets</h1>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tickets-page">
        <div className="page-header">
          <h1>Meus Tickets</h1>
        </div>
        <div className="error-box">
          <p>⚠️ {error}</p>
          <button onClick={loadTickets} className="btn-retry">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tickets-page">
      <div className="page-header">
        <div>
          <h1>Meus Tickets</h1>
          <p>Gerencie seus chamados de suporte</p>
        </div>
        <button
          className="btn-new-ticket"
          onClick={() => navigate('/create-ticket')}
        >
          ➕ Novo Ticket
        </button>
      </div>

      <div className="tickets-content">
        <div className="tickets-filters">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Todos ({tickets.length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'open' ? 'active' : ''}`}
            onClick={() => setFilterStatus('open')}
          >
            Abertos ({tickets.filter((t) => t.status === 'open').length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilterStatus('in_progress')}
          >
            Em Andamento ({tickets.filter((t) => t.status === 'in_progress').length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('resolved')}
          >
            Resolvidos ({tickets.filter((t) => t.status === 'resolved').length})
          </button>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="no-tickets">
            <span className="no-tickets-icon">📋</span>
            <h3>Nenhum ticket encontrado</h3>
            <p>
              {filterStatus === 'all'
                ? 'Você ainda não criou nenhum ticket.'
                : 'Nenhum ticket com este status.'}
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('/create-ticket')}
            >
              Criar Primeiro Ticket
            </button>
          </div>
        ) : (
          <div className="tickets-list">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-code">{ticket.code}</div>
                  <div className="ticket-badges">
                    <span className={`badge ${getPriorityClass(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className={`badge ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                </div>
                <div className="ticket-body">
                  <h3 className="ticket-title">{ticket.title}</h3>
                  {ticket.category && (
                    <span className="ticket-category">📁 {ticket.category}</span>
                  )}
                  <div className="ticket-meta">
                    <span className="ticket-date">🕐 {formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

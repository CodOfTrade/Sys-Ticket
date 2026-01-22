import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentConfig } from '@shared/types';
import './CreateTicket.css';

interface CreateTicketProps {
  config: AgentConfig;
}

export function CreateTicket({ config }: CreateTicketProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }

    if (!description.trim()) {
      setError('A descrição é obrigatória');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Implementar criação de ticket via API
      // const response = await window.electronAPI.createTicket({
      //   title,
      //   description,
      //   priority,
      //   category: category || undefined,
      // });

      // Simulação temporária
      console.log('Criando ticket:', { title, description, priority, category });

      // Aguardar 1s para simular requisição
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert('Ticket criado com sucesso!');
      navigate('/tickets');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ticket-page">
      <div className="page-header">
        <div>
          <h1>Abrir Ticket</h1>
          <p>Crie um novo chamado de suporte</p>
        </div>
      </div>

      <div className="create-ticket-content">
        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-section">
            <h2>Informações Básicas</h2>

            <div className="form-group">
              <label htmlFor="title">Título do Ticket *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva brevemente o problema"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição Detalhada *</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Forneça o máximo de detalhes possível sobre o problema..."
                rows={6}
                disabled={loading}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">Prioridade</label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={loading}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Categoria (Opcional)</label>
                <input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Hardware, Software, Rede"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Informações do Sistema</h2>
            <div className="system-info-box">
              <div className="info-item">
                <span className="label">Recurso:</span>
                <span className="value">{config.resourceCode}</span>
              </div>
              <div className="info-item">
                <span className="label">Cliente:</span>
                <span className="value">{config.clientName || config.clientId}</span>
              </div>
              {config.contractId && (
                <div className="info-item">
                  <span className="label">Contrato:</span>
                  <span className="value">{config.contractId}</span>
                </div>
              )}
            </div>
            <p className="system-info-note">
              Estas informações serão anexadas automaticamente ao ticket.
            </p>
          </div>

          <div className="form-section">
            <h2>Anexos (Em Desenvolvimento)</h2>
            <div className="attachments-box">
              <button
                type="button"
                className="btn-attachment"
                disabled
              >
                📷 Capturar Screenshot (Em breve)
              </button>
              <button
                type="button"
                className="btn-attachment"
                disabled
              >
                📎 Anexar Arquivo (Em breve)
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

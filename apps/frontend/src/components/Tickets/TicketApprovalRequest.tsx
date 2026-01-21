import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  Edit2,
  X,
  AlertCircle,
  User,
  History,
} from 'lucide-react';
import { ticketService } from '@/services/ticket.service';
import { clientService } from '@/services/client.service';
import { TicketApproval, ApprovalStatus, RequestApprovalDto, UpdateApproverDto } from '@/types/ticket.types';

interface TicketApprovalRequestProps {
  ticketId: string;
  clientId: string;
  readOnly?: boolean;
}

const statusLabels: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'Pendente',
  [ApprovalStatus.APPROVED]: 'Aprovado',
  [ApprovalStatus.REJECTED]: 'Rejeitado',
  [ApprovalStatus.EXPIRED]: 'Expirado',
  [ApprovalStatus.CANCELLED]: 'Cancelado',
};

const statusColors: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ApprovalStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [ApprovalStatus.EXPIRED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [ApprovalStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const statusIcons: Record<ApprovalStatus, any> = {
  [ApprovalStatus.PENDING]: Clock,
  [ApprovalStatus.APPROVED]: CheckCircle,
  [ApprovalStatus.REJECTED]: XCircle,
  [ApprovalStatus.EXPIRED]: AlertCircle,
  [ApprovalStatus.CANCELLED]: X,
};

export function TicketApprovalRequest({ ticketId, clientId, readOnly = false }: TicketApprovalRequestProps) {
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form state for new request
  const [useContact, setUseContact] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approverName, setApproverName] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Edit modal state
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');

  // Fetch pending approval
  const { data: pendingApproval, isLoading: isLoadingPending } = useQuery({
    queryKey: ['ticket-approval-pending', ticketId],
    queryFn: () => ticketService.getPendingApproval(ticketId),
  });

  // Fetch approval history
  const { data: approvalHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['ticket-approval-history', ticketId],
    queryFn: () => ticketService.getApprovalHistory(ticketId),
  });

  // Fetch client contacts
  const { data: clientContacts = [] } = useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: () => clientService.getContacts(clientId),
    enabled: !!clientId,
  });

  // Request approval mutation
  const requestApprovalMutation = useMutation({
    mutationFn: (data: RequestApprovalDto) => ticketService.requestApproval(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-pending', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-history', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowRequestModal(false);
      resetForm();
    },
    onError: (error: any) => {
      alert('Erro ao solicitar aprovacao: ' + (error.response?.data?.message || error.message));
    },
  });

  // Cancel approval mutation
  const cancelApprovalMutation = useMutation({
    mutationFn: (approvalId: string) => ticketService.cancelApproval(ticketId, approvalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-pending', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-history', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error: any) => {
      alert('Erro ao cancelar solicitacao: ' + (error.response?.data?.message || error.message));
    },
  });

  // Resend email mutation
  const resendEmailMutation = useMutation({
    mutationFn: (approvalId: string) => ticketService.resendApprovalEmail(ticketId, approvalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-pending', ticketId] });
      alert('Email reenviado com sucesso!');
    },
    onError: (error: any) => {
      alert('Erro ao reenviar email: ' + (error.response?.data?.message || error.message));
    },
  });

  // Update approver mutation
  const updateApproverMutation = useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: UpdateApproverDto }) =>
      ticketService.updateApproverEmail(ticketId, approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-pending', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-approval-history', ticketId] });
      setShowEditModal(false);
      setEditEmail('');
      setEditName('');
      alert('Aprovador atualizado com sucesso! Um novo email foi enviado.');
    },
    onError: (error: any) => {
      alert('Erro ao atualizar aprovador: ' + (error.response?.data?.message || error.message));
    },
  });

  const resetForm = () => {
    setUseContact(true);
    setSelectedContactId('');
    setApproverEmail('');
    setApproverName('');
    setCustomMessage('');
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const data: RequestApprovalDto = {
      message: customMessage || undefined,
    };

    if (useContact && selectedContactId) {
      data.contact_id = selectedContactId;
    } else if (!useContact && approverEmail) {
      data.approver_email = approverEmail;
      data.approver_name = approverName || undefined;
    } else {
      alert('Selecione um contato ou informe um email.');
      return;
    }

    requestApprovalMutation.mutate(data);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editEmail.includes('@')) {
      alert('Informe um email valido.');
      return;
    }

    if (!pendingApproval) return;

    updateApproverMutation.mutate({
      approvalId: pendingApproval.id,
      data: {
        approver_email: editEmail,
        approver_name: editName || undefined,
      },
    });
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m restantes`;
  };

  if (isLoadingPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Aprovacao de Ticket
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Solicite aprovacao do cliente antes de prosseguir
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {approvalHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              Historico
            </button>
          )}
          {!readOnly && !pendingApproval && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Solicitar Aprovacao
            </button>
          )}
        </div>
      </div>

      {/* Pending Approval Card */}
      {pendingApproval && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {(() => {
                const StatusIcon = statusIcons[pendingApproval.status as ApprovalStatus];
                return StatusIcon ? <StatusIcon className="w-6 h-6 text-yellow-600" /> : null;
              })()}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Solicitacao Pendente
                </h4>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[pendingApproval.status as ApprovalStatus]}`}>
                  {statusLabels[pendingApproval.status as ApprovalStatus]}
                </span>
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resendEmailMutation.mutate(pendingApproval.id)}
                  disabled={resendEmailMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Reenviar email"
                >
                  <RefreshCw className={`w-4 h-4 ${resendEmailMutation.isPending ? 'animate-spin' : ''}`} />
                  Reenviar
                </button>
                <button
                  onClick={() => {
                    setEditEmail(pendingApproval.approver_email);
                    setEditName(pendingApproval.approver_name || '');
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Editar aprovador"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja cancelar esta solicitacao?')) {
                      cancelApprovalMutation.mutate(pendingApproval.id);
                    }
                  }}
                  disabled={cancelApprovalMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Cancelar solicitacao"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Aprovador</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {pendingApproval.approver_name || pendingApproval.approver_email}
                </p>
                {pendingApproval.approver_name && (
                  <p className="text-xs text-gray-500">{pendingApproval.approver_email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Expira em</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getTimeRemaining(pendingApproval.expires_at)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(pendingApproval.expires_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Solicitado por</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {pendingApproval.requested_by?.name || 'Usuario'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Email enviado</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {pendingApproval.email_sent ? 'Sim' : 'Nao'}
                  {pendingApproval.email_retry_count > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({pendingApproval.email_retry_count} reenvio(s))
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {pendingApproval.custom_message && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mensagem personalizada:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                {pendingApproval.custom_message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!pendingApproval && approvalHistory.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Nenhuma solicitacao de aprovacao ainda
          </p>
          {!readOnly && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Solicitar Aprovacao
            </button>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Shield className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Solicitar Aprovacao
              </h3>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-4 space-y-4">
              {/* Toggle between contact and manual */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUseContact(true)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    useContact
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Contato do Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setUseContact(false)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !useContact
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Email Manual
                </button>
              </div>

              {useContact ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecione o contato
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                    required={useContact}
                  >
                    <option value="">Selecione um contato...</option>
                    {clientContacts.filter((c: any) => c.email).map((contact: any) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.email})
                      </option>
                    ))}
                  </select>
                  {clientContacts.filter((c: any) => c.email).length === 0 && (
                    <p className="mt-2 text-sm text-red-500">
                      Nenhum contato com email cadastrado. Use a opcao "Email Manual".
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email do aprovador *
                    </label>
                    <input
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="email@exemplo.com"
                      required={!useContact}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome do aprovador (opcional)
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nome do aprovador"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem personalizada (opcional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 resize-none"
                  rows={3}
                  placeholder="Mensagem adicional para o aprovador..."
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atencao:</strong> Um email sera enviado ao aprovador com links para aprovar ou rejeitar este ticket.
                  O link expira em 48 horas.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={requestApprovalMutation.isPending}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
                >
                  {requestApprovalMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Solicitacao
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && pendingApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Edit2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Editar Aprovador
              </h3>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Atencao:</strong> Ao alterar o aprovador, um novo token sera gerado e um novo email sera enviado.
                  O token anterior sera invalidado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Novo email do aprovador *
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do aprovador (opcional)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do aprovador"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditEmail('');
                    setEditName('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateApproverMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
                >
                  {updateApproverMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Salvar e Enviar Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Historico de Aprovacoes
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : approvalHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum historico encontrado</p>
              ) : (
                <div className="space-y-4">
                  {approvalHistory.map((approval: TicketApproval) => {
                    const StatusIcon = statusIcons[approval.status as ApprovalStatus];
                    return (
                      <div
                        key={approval.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {StatusIcon && <StatusIcon className="w-5 h-5 text-gray-500" />}
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[approval.status as ApprovalStatus]}`}>
                              {statusLabels[approval.status as ApprovalStatus]}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(approval.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Aprovador:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {approval.approver_name || approval.approver_email}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Solicitado por:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {approval.requested_by?.name || 'Usuario'}
                            </span>
                          </div>
                          {approval.responded_at && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Respondido em:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {formatDate(approval.responded_at)}
                              </span>
                            </div>
                          )}
                          {approval.comment && (
                            <div className="col-span-2 mt-2">
                              <span className="text-gray-500">Comentario:</span>
                              <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded mt-1">
                                {approval.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

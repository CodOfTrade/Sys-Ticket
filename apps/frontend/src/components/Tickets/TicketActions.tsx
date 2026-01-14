import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  MoreVertical,
  X,
  CheckCircle,
  XCircle,
  FileText,
  Copy,
  ClipboardList,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { ticketService } from '@/services/ticket.service';
import { appointmentsService } from '@/services/ticket-details.service';
import { Ticket } from '@/types/ticket.types';
import jsPDF from 'jspdf';

interface TicketActionsProps {
  ticket: Ticket;
}

export function TicketActions({ ticket }: TicketActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Buscar resumo de apontamentos para verificar se pode fechar
  const { data: appointmentsSummary } = useQuery({
    queryKey: ['appointments-summary', ticket.id],
    queryFn: () => appointmentsService.getAppointmentsSummary(ticket.id),
  });

  // Buscar apontamentos para o PDF
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', ticket.id],
    queryFn: () => appointmentsService.getAppointments(ticket.id),
  });

  const hasAppointments = appointments.length > 0;

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Mutation para fechar ticket
  const closeTicketMutation = useMutation({
    mutationFn: () => ticketService.update(ticket.id, { status: 'closed' as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      setShowCloseModal(false);
    },
    onError: (error: any) => {
      alert('Erro ao fechar ticket: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para cancelar ticket
  const cancelTicketMutation = useMutation({
    mutationFn: () => ticketService.update(ticket.id, {
      status: 'cancelled' as any,
      // A justificativa é registrada no histórico do ticket via backend
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      setShowCancelModal(false);
      setCancelReason('');
    },
    onError: (error: any) => {
      alert('Erro ao cancelar ticket: ' + (error.response?.data?.message || error.message));
    },
  });

  // Mutation para duplicar ticket
  const duplicateTicketMutation = useMutation({
    mutationFn: async () => {
      // Mapear apenas os campos aceitos pelo CreateTicketDto
      const duplicateData: any = {
        client_id: ticket.client_id,
        client_name: ticket.client_name || ticket.client?.name || '',
        requester_name: ticket.requester_name || '',
        requester_email: ticket.requester_email,
        requester_phone: ticket.requester_phone,
        title: `[CÓPIA] ${ticket.title}`,
        description: ticket.description || '',
        priority: ticket.priority,
        type: ticket.type,
        category: ticket.category,
        tags: ticket.tags,
        service_desk_id: ticket.service_desk_id,
        service_catalog_id: ticket.service_catalog_id,
        contact_id: ticket.contact_id,
        assigned_to_id: ticket.assigned_to_id,
        contract_id: ticket.contract_id,
        contract_coverage: ticket.contract_coverage,
        latitude: ticket.latitude,
        longitude: ticket.longitude,
        location_address: (ticket as any).location_address,
        custom_fields: ticket.custom_fields,
        metadata: {
          ...(ticket.metadata || {}),
          duplicated_from: ticket.id,
          duplicated_at: new Date().toISOString(),
        },
      };

      // Remover campos undefined/null
      Object.keys(duplicateData).forEach(key => {
        if (duplicateData[key] === undefined || duplicateData[key] === null) {
          delete duplicateData[key];
        }
      });

      return ticketService.create(duplicateData);
    },
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${newTicket.id}`);
    },
    onError: (error: any) => {
      alert('Erro ao duplicar ticket: ' + (error.response?.data?.message || error.message));
    },
  });

  // Gerar PDF de apontamento offline
  const generateOfflineAppointmentPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Logo/Header
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('SysTicket', margin, y);
    y += 15;

    // Título
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text(`Informações do Ticket #${ticket.ticket_number}`, margin, y);
    y += 12;

    // Linha separadora
    doc.setDrawColor(189, 195, 199);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Informações do ticket
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('Título', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.title, margin + 30, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Status', pageWidth - 80, y);
    doc.setFont('helvetica', 'normal');
    const statusLabels: Record<string, string> = {
      new: 'Novo', in_progress: 'Em Andamento', waiting_client: 'Aguardando Cliente',
      paused: 'Pausado', resolved: 'Resolvido', closed: 'Fechado', cancelled: 'Cancelado'
    };
    doc.text(statusLabels[ticket.status] || ticket.status, pageWidth - 50, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Criado em', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(ticket.created_at).toLocaleString('pt-BR'), margin + 30, y);
    y += 12;

    // Cliente
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text('Cliente:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);
    doc.text(ticket.client_name || ticket.client?.name || '-', margin + 25, y);
    y += 6;

    // Endereço do cliente (se disponível)
    const locationAddress = (ticket as any).location_address;
    if (locationAddress) {
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço do cliente:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(locationAddress, margin, y);
      y += 8;
    }

    // Solicitante
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text('Solicitante', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);
    const requesterInfo = ticket.requester_email
      ? `${ticket.requester_name} (${ticket.requester_email})`
      : ticket.requester_name;
    doc.text(requesterInfo || '-', margin + 30, y);
    y += 8;

    // Responsável
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 80);
    doc.text('Responsável', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);
    doc.text(ticket.assigned_to?.name || '-', margin + 35, y);
    y += 8;

    // Prioridade
    doc.setFont('helvetica', 'bold');
    doc.text('Prioridade', pageWidth - 80, y - 8);
    doc.setFont('helvetica', 'normal');
    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };
    doc.text(priorityLabels[ticket.priority] || '-', pageWidth - 50, y - 8);

    y += 4;

    // Descrição
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text('Descrição', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 62, 80);

    // Remover tags HTML da descrição
    const descriptionText = ticket.description
      ? ticket.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
      : 'Sem descrição';
    const descLines = doc.splitTextToSize(descriptionText, pageWidth - 2 * margin);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 10;

    // Seção de Apontamentos
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text('Apontamentos', margin, y);
    y += 8;

    // Área para escrever apontamentos (linhas)
    doc.setDrawColor(189, 195, 199);
    for (let i = 0; i < 12; i++) {
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    y += 5;

    // Seção de Valorização
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 126, 34);
    doc.text('Valorização', margin, y);
    y += 8;

    // Box para valorização
    doc.setDrawColor(189, 195, 199);
    doc.rect(margin, y, pageWidth - 2 * margin, 20);
    y += 30;

    // Declaração de ciência
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    const declaracao = 'Declaro estar ciente do trabalho acima realizado e concordo com a realização do mesmo.';
    const declaracaoWidth = doc.getTextWidth(declaracao);
    doc.text(declaracao, (pageWidth - declaracaoWidth) / 2, y);
    y += 20;

    // Linha para assinatura
    doc.line(margin + 30, y, pageWidth - margin - 30, y);
    y += 8;

    // Nome do cliente (para assinatura)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const clientName = ticket.client_name || ticket.client?.name || 'CLIENTE';
    const clientNameWidth = doc.getTextWidth(clientName);
    doc.text(clientName, (pageWidth - clientNameWidth) / 2, y);

    // Salvar PDF
    doc.save(`Apontamento_offline_${ticket.ticket_number}.pdf`);
  };

  // Estado para opções do relatório
  const [reportOptions, setReportOptions] = useState({
    includeDescription: true,
    includeAppointments: true,
    includeComments: false,
    includeAttachments: false,
    includeHistory: false,
  });

  // Gerar relatório do ticket
  const generateReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('SysTicket - Relatório', margin, y);
    y += 15;

    // Título do ticket
    doc.setFontSize(14);
    doc.text(`Ticket #${ticket.ticket_number}`, margin, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.title, margin, y);
    y += 12;

    // Linha
    doc.setDrawColor(189, 195, 199);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Informações básicas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.client_name || '-', margin + 25, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Solicitante:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.requester_name || '-', margin + 30, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Responsável:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.assigned_to?.name || '-', margin + 32, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Criado em:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(ticket.created_at).toLocaleString('pt-BR'), margin + 28, y);
    y += 6;

    const statusLabels: Record<string, string> = {
      new: 'Novo', in_progress: 'Em Andamento', waiting_client: 'Aguardando Cliente',
      paused: 'Pausado', resolved: 'Resolvido', closed: 'Fechado', cancelled: 'Cancelado'
    };
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(statusLabels[ticket.status] || ticket.status, margin + 20, y);

    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };
    doc.setFont('helvetica', 'bold');
    doc.text('Prioridade:', margin + 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(priorityLabels[ticket.priority] || '-', margin + 85, y);
    y += 12;

    // Descrição
    if (reportOptions.includeDescription) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Descrição', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const descText = ticket.description
        ? ticket.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
        : 'Sem descrição';
      const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 10;
    }

    // Apontamentos
    if (reportOptions.includeAppointments && appointments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Apontamentos', margin, y);
      y += 8;
      doc.setFontSize(9);

      appointments.forEach((apt: any, index: number) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${apt.technician?.name || 'Técnico'}`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`- ${new Date(apt.start_time).toLocaleString('pt-BR')}`, margin + 60, y);
        y += 5;

        if (apt.description) {
          const aptDesc = apt.description.replace(/<[^>]*>/g, '');
          const aptLines = doc.splitTextToSize(aptDesc, pageWidth - 2 * margin - 10);
          doc.text(aptLines, margin + 5, y);
          y += aptLines.length * 4 + 3;
        }
        y += 3;
      });
    }

    // Valorização (resumo financeiro)
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(230, 126, 34);
    doc.text('Valorização', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);

    // Total de horas
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Horas:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${appointmentsSummary?.total_hours?.toFixed(2) || '0.00'}h`, margin + 40, y);
    y += 6;

    // Total de apontamentos
    doc.setFont('helvetica', 'bold');
    doc.text('Apontamentos:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${appointments.length}`, margin + 40, y);
    y += 6;

    // Custo total
    doc.setFont('helvetica', 'bold');
    doc.text('Custo Total:', margin, y);
    doc.setFont('helvetica', 'normal');
    const totalCost = appointmentsSummary?.total_cost || 0;
    doc.text(`R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 40, y);
    y += 12;

    // Linha separadora
    doc.setDrawColor(189, 195, 199);
    doc.line(margin, y, pageWidth - margin, y);

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Relatório gerado em ${new Date().toLocaleString('pt-BR')} - SysTicket`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );

    doc.save(`Relatorio_Ticket_${ticket.ticket_number}.pdf`);
    setShowReportModal(false);
  };

  const actions = [
    {
      id: 'close',
      label: 'Fechar Ticket',
      icon: CheckCircle,
      color: 'text-green-600',
      disabled: ticket.status === 'closed' || ticket.status === 'cancelled',
      disabledReason: !hasAppointments ? 'Necessário ter apontamentos' : undefined,
      onClick: () => {
        if (!hasAppointments) {
          alert('É necessário ter pelo menos um apontamento para fechar o ticket.');
          return;
        }
        setShowCloseModal(true);
      },
    },
    {
      id: 'cancel',
      label: 'Cancelar Ticket',
      icon: XCircle,
      color: 'text-red-600',
      disabled: ticket.status === 'closed' || ticket.status === 'cancelled',
      onClick: () => setShowCancelModal(true),
    },
    {
      id: 'offline',
      label: 'Apontamento Offline',
      icon: Printer,
      color: 'text-blue-600',
      onClick: generateOfflineAppointmentPDF,
    },
    {
      id: 'report',
      label: 'Relatório',
      icon: FileText,
      color: 'text-purple-600',
      onClick: () => setShowReportModal(true),
    },
    {
      id: 'duplicate',
      label: 'Duplicar Ticket',
      icon: Copy,
      color: 'text-orange-600',
      onClick: () => duplicateTicketMutation.mutate(),
    },
  ];

  return (
    <>
      {/* Botão de Ações */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          <ClipboardList className="w-5 h-5" />
          Ações
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    setShowMenu(false);
                    action.onClick();
                  }}
                  disabled={action.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                    action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={action.disabledReason}
                >
                  <Icon className={`w-5 h-5 ${action.color}`} />
                  <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Fechar Ticket */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fechar Ticket
              </h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tem certeza que deseja fechar este ticket?
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>Apontamentos:</strong> {appointments.length}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>Tempo total:</strong> {appointmentsSummary?.total_hours?.toFixed(1) || '0'}h
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => closeTicketMutation.mutate()}
                disabled={closeTicketMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                {closeTicketMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Fechando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Fechamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Ticket */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cancelar Ticket
              </h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Por favor, informe o motivo do cancelamento:
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Justificativa do cancelamento..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              {cancelReason.length < 10 && cancelReason.length > 0 && (
                <p className="mt-1 text-sm text-red-500">
                  A justificativa deve ter pelo menos 10 caracteres
                </p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelTicketMutation.mutate()}
                disabled={cancelReason.length < 10 || cancelTicketMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancelTicketMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirmar Cancelamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Relatório */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Gerar Relatório
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Selecione o que deseja incluir no relatório:
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeDescription}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeDescription: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Descrição do ticket</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeAppointments}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeAppointments: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Apontamentos ({appointments.length})</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeComments}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeComments: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Comentários</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeHistory}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeHistory: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Histórico de alterações</span>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

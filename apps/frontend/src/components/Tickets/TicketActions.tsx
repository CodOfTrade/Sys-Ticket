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
      // Usar any para acessar todos os campos do ticket
      const t = ticket as any;

      // Mapear apenas os campos aceitos pelo CreateTicketDto
      const duplicateData: any = {
        client_id: t.client_id,
        client_name: t.client_name || t.client?.name || '',
        requester_name: t.requester_name || '',
        requester_email: t.requester_email,
        requester_phone: t.requester_phone,
        title: `[CÓPIA] ${t.title}`,
        description: t.description || '',
        priority: t.priority,
        type: t.type,
        category: t.category,
        tags: t.tags,
        service_desk_id: t.service_desk_id,
        service_catalog_id: t.service_catalog_id,
        contact_id: t.contact_id,
        assigned_to_id: t.assigned_to_id,
        contract_id: t.contract_id,
        contract_coverage: t.contract_coverage,
        latitude: t.latitude,
        longitude: t.longitude,
        location_address: t.location_address,
        custom_fields: t.custom_fields,
        metadata: {
          ...(t.metadata || {}),
          duplicated_from: t.id,
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

  // Gerar PDF de apontamento offline (estilo compacto Tiflux)
  const generateOfflineAppointmentPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 12;
    const t = ticket as any;

    // Cores
    const primaryColor = { r: 0, g: 150, b: 180 };
    const grayColor = { r: 100, g: 100, b: 100 };
    const darkColor = { r: 50, g: 50, b: 50 };
    const orangeColor = { r: 230, g: 126, b: 34 };

    // Labels
    const statusLabels: Record<string, string> = {
      new: 'NOVO', in_progress: 'EM ANDAMENTO', waiting_client: 'AGUARDANDO',
      paused: 'PAUSADO', resolved: 'RESOLVIDO', closed: 'FECHADO', cancelled: 'CANCELADO'
    };
    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };

    // ===== CABEÇALHO =====
    // Nome do cliente grande
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(t.client_name || t.client?.name || 'Cliente', margin, y + 5);

    // Logo SysTicket (direita)
    doc.setFontSize(14);
    doc.text('Sys', pageWidth - margin - 28, y + 3);
    doc.setTextColor(orangeColor.r, orangeColor.g, orangeColor.b);
    doc.text('Ticket', pageWidth - margin - 15, y + 3);
    y += 12;

    // Linha separadora
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Número e título do ticket + Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    const titleText = `#${t.ticket_number} - ${t.title}`;
    doc.text(titleText.substring(0, 60), margin, y);
    doc.setFontSize(9);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text(statusLabels[t.status] || t.status, pageWidth - margin, y, { align: 'right' });
    y += 8;

    // ===== BOX CLIENTE (compacto) =====
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('INFORMAÇÕES DO CLIENTE', pageWidth / 2, y + 4, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, 18);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);

    // Linha 1: Cliente | Solicitante | Telefone
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text('Cliente:', margin + 2, y + 3);
    doc.text('Solicitante:', margin + 70, y + 3);
    doc.text('Telefone:', pageWidth - margin - 40, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text((t.client_name || '-').substring(0, 25), margin + 18, y + 3);
    doc.text((t.requester_name || '-').substring(0, 25), margin + 92, y + 3);
    doc.text(t.requester_phone || '( )', pageWidth - margin - 3, y + 3, { align: 'right' });
    y += 14;

    // ===== BOX TICKET (compacto) =====
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('INFORMAÇÕES DO TICKET', pageWidth / 2, y + 4, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, 14);
    y += 8;

    // Mesa | Responsável | Aberto | Prioridade
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text('Mesa:', margin + 2, y + 2);
    doc.text('Responsável:', margin + 50, y + 2);
    doc.text('Aberto em:', margin + 105, y + 2);
    doc.text('Prioridade:', pageWidth - margin - 25, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text((t.service_desk?.name || '-').substring(0, 18), margin + 14, y + 2);
    doc.text((t.assigned_to?.name || '-').substring(0, 18), margin + 72, y + 2);
    doc.text(new Date(t.created_at).toLocaleDateString('pt-BR'), margin + 125, y + 2);
    doc.text(priorityLabels[t.priority] || '-', pageWidth - margin - 3, y + 2, { align: 'right' });
    y += 10;

    // ===== DESCRIÇÃO (compacta) =====
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIÇÃO DO TICKET', pageWidth / 2, y + 4, { align: 'center' });

    const descText = t.description
      ? t.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      : 'Sem descrição';
    const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin - 6);
    const descHeight = Math.min(Math.max(10, descLines.length * 3.5 + 4), 25);

    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, descHeight + 6);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text(descLines.slice(0, 5), margin + 3, y + 2); // Max 5 linhas
    y += descHeight + 2;

    // ===== APONTAMENTO OFFLINE =====
    doc.setFillColor(orangeColor.r, orangeColor.g, orangeColor.b);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('APONTAMENTO', pageWidth / 2, y + 4, { align: 'center' });
    y += 8;

    // Campos para preencher manualmente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);

    // Data | Hora Início | Hora Fim | Duração
    doc.text('Data:', margin + 2, y);
    doc.text('____/____/________', margin + 14, y);
    doc.text('Início:', margin + 55, y);
    doc.text('____:____', margin + 70, y);
    doc.text('Fim:', margin + 95, y);
    doc.text('____:____', margin + 105, y);
    doc.text('Duração:', margin + 135, y);
    doc.text('____:____', margin + 152, y);
    y += 8;

    // Tipo | Técnico
    doc.text('Tipo:', margin + 2, y);
    doc.text('( ) Remoto  ( ) Externo  ( ) Interno', margin + 14, y);
    doc.text('Técnico:', margin + 100, y);
    doc.text('_______________________', margin + 118, y);
    y += 10;

    // Área de descrição do serviço
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text('Descrição do Serviço Realizado:', margin + 2, y);
    y += 5;

    // Linhas para escrever (6 linhas)
    doc.setDrawColor(180, 180, 180);
    for (let i = 0; i < 6; i++) {
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    }

    y += 3;

    // ===== VALORIZAÇÃO =====
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('VALORIZAÇÃO', pageWidth / 2, y + 4, { align: 'center' });
    y += 8;

    // Campos de valorização em linha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text('Horas:', margin + 2, y);
    doc.text('________', margin + 16, y);
    doc.text('Valor/Hora:', margin + 45, y);
    doc.text('R$ ________', margin + 68, y);
    doc.text('Total:', margin + 110, y);
    doc.text('R$ ________________', margin + 125, y);
    y += 15;

    // ===== DECLARAÇÃO E ASSINATURA =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    const declaracao = 'Declaro estar ciente do trabalho acima realizado e concordo com a realização do mesmo.';
    doc.text(declaracao, pageWidth / 2, y, { align: 'center' });
    y += 18;

    // Linha para assinatura
    doc.setDrawColor(grayColor.r, grayColor.g, grayColor.b);
    doc.line(margin + 35, y, pageWidth - margin - 35, y);
    y += 5;

    // Nome do cliente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(t.client_name || t.client?.name || 'CLIENTE', pageWidth / 2, y, { align: 'center' });

    // Rodapé
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - SysTicket`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Salvar PDF
    doc.save(`Apontamento_offline_${t.ticket_number}.pdf`);
  };

  // Estado para opções do relatório
  const [reportOptions, setReportOptions] = useState({
    includeDescription: true,
    includeAppointments: true,
    includeComments: false,
    includeAttachments: false,
    includeHistory: false,
  });

  // Gerar relatório do ticket (estilo Tiflux)
  const generateReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 15;
    const t = ticket as any;

    // Cores
    const primaryColor = { r: 0, g: 150, b: 180 }; // Azul/teal
    const grayColor = { r: 100, g: 100, b: 100 };
    const darkColor = { r: 50, g: 50, b: 50 };
    const lightGray = { r: 240, g: 240, b: 240 };

    // Labels
    const statusLabels: Record<string, string> = {
      new: 'TICKET NOVO', in_progress: 'TICKET EM ANDAMENTO', waiting_client: 'AGUARDANDO CLIENTE',
      paused: 'TICKET PAUSADO', resolved: 'TICKET RESOLVIDO', closed: 'TICKET FECHADO', cancelled: 'TICKET CANCELADO'
    };
    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };
    const typeLabels: Record<string, string> = {
      remote: 'Remoto', on_site: 'Externo', internal: 'Interno'
    };

    // Função helper para desenhar box com header colorido
    const drawSectionBox = (title: string, startY: number, height: number) => {
      // Header do box
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.rect(margin, startY, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title, pageWidth / 2, startY + 5.5, { align: 'center' });
      // Box content area
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, startY, pageWidth - 2 * margin, height);
      return startY + 8;
    };

    // Função para formatar duração em HH:MM
    const formatDuration = (hours: number) => {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // ===== CABEÇALHO =====
    // Nome do cliente grande
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(t.client_name || t.client?.name || 'Cliente', margin, y + 8);

    // Logo SysTicket (lado direito)
    doc.setFontSize(18);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('Sys', pageWidth - margin - 35, y + 5);
    doc.setTextColor(230, 126, 34);
    doc.text('Ticket', pageWidth - margin - 20, y + 5);
    y += 18;

    // Linha separadora
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Número e título do ticket + Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text(`#${t.ticket_number} - ${t.title}`, margin, y);

    doc.setFontSize(10);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text(statusLabels[t.status] || t.status, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // ===== BOX CLIENTE =====
    const clientBoxY = y;
    const contentY = drawSectionBox(t.client_name || t.client?.name || 'CLIENTE', clientBoxY, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text('ENDEREÇOS DO CLIENTE', margin + 5, contentY + 5);
    doc.text('SOLICITANTE', pageWidth / 2, contentY + 5, { align: 'center' });
    doc.text('TELEFONE DO SOLICITANTE', pageWidth - margin - 5, contentY + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    const endereco = t.location_address || '-';
    doc.text(endereco.substring(0, 45), margin + 5, contentY + 12);
    doc.text(t.requester_name || '-', pageWidth / 2, contentY + 12, { align: 'center' });
    doc.text(t.requester_phone || '( )', pageWidth - margin - 5, contentY + 12, { align: 'right' });
    y = clientBoxY + 32;

    // ===== INFORMAÇÕES DO TICKET =====
    const infoBoxY = y;
    const infoContentY = drawSectionBox('INFORMAÇÕES DO TICKET', infoBoxY, 22);

    // Headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    const cols = [margin + 5, margin + 45, margin + 85, margin + 125, pageWidth - margin - 25];
    doc.text('MESA', cols[0], infoContentY + 4);
    doc.text('RESPONSÁVEL', cols[1], infoContentY + 4);
    doc.text('ABERTO EM', cols[2], infoContentY + 4);
    doc.text('FECHADO EM', cols[3], infoContentY + 4);
    doc.text('PRIORIDADE', cols[4], infoContentY + 4);

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
    doc.text(t.service_desk?.name || '-', cols[0], infoContentY + 10);
    doc.text(t.assigned_to?.name || '-', cols[1], infoContentY + 10);
    doc.text(new Date(t.created_at).toLocaleDateString('pt-BR'), cols[2], infoContentY + 10);
    doc.text(t.closed_at ? new Date(t.closed_at).toLocaleDateString('pt-BR') : '-', cols[3], infoContentY + 10);
    doc.text(priorityLabels[t.priority] || '-', cols[4], infoContentY + 10);
    y = infoBoxY + 26;

    // ===== DESCRIÇÃO DO TICKET =====
    if (reportOptions.includeDescription) {
      const descBoxY = y;
      const descText = t.description
        ? t.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
        : 'Sem descrição';
      const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin - 10);
      const descHeight = Math.max(15, descLines.length * 4 + 10);

      const descContentY = drawSectionBox('DESCRIÇÃO DO TICKET', descBoxY, descHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
      doc.text(descLines, margin + 5, descContentY + 6);
      y = descBoxY + descHeight + 4;
    }

    // ===== APONTAMENTOS =====
    if (reportOptions.includeAppointments && appointments.length > 0) {
      y += 5;

      // Título grande
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('APONTAMENTOS', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Header do ticket
      doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
      doc.text(`#${t.ticket_number} - ${t.title}`, margin + 3, y + 4);
      doc.text('SOLICITANTE:', pageWidth - margin - 30, y + 4);
      y += 8;

      // Headers da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
      const aptCols = [margin + 3, margin + 45, margin + 65, margin + 85, margin + 105, margin + 130, pageWidth - margin - 15];
      doc.text('Período', aptCols[0], y);
      doc.text('Duração', aptCols[1], y);
      doc.text('Desloc.', aptCols[2], y);
      doc.text('Assistência', aptCols[3], y);
      doc.text('Contrato', aptCols[4], y);
      doc.text('Serviço', aptCols[5], y);
      doc.text('Valor', aptCols[6], y);
      y += 5;

      // Linha
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;

      // Apontamentos
      let totalExterno = 0;
      let totalRemoto = 0;
      let totalInterno = 0;

      // Labels de cobertura
      const coverageLabels: Record<string, string> = {
        contract: 'Contrato', billable: 'Avulso', warranty: 'Garantia', courtesy: 'Cortesia'
      };

      appointments.forEach((apt: any) => {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }

        // Combinar appointment_date com start_time/end_time
        const aptDate = apt.appointment_date ? new Date(apt.appointment_date) : new Date();
        const dateStr = aptDate.toLocaleDateString('pt-BR');

        // start_time e end_time são strings "HH:MM"
        const startTimeStr = apt.start_time || '00:00';
        const endTimeStr = apt.end_time || '00:00';

        // Calcular duração usando duration_minutes se disponível
        let durationHours = 0;
        if (apt.duration_minutes) {
          durationHours = apt.duration_minutes / 60;
        } else {
          // Calcular a partir dos horários
          const [startH, startM] = startTimeStr.split(':').map(Number);
          const [endH, endM] = endTimeStr.split(':').map(Number);
          const startMinutes = (startH || 0) * 60 + (startM || 0);
          const endMinutes = (endH || 0) * 60 + (endM || 0);
          durationHours = (endMinutes - startMinutes) / 60;
        }

        const durationStr = formatDuration(Math.max(0, durationHours));

        // Categorizar por tipo
        const serviceType = apt.service_type || 'remote';
        if (serviceType === 'on_site') totalExterno += durationHours;
        else if (serviceType === 'remote') totalRemoto += durationHours;
        else totalInterno += durationHours;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);

        const periodo = `${dateStr} (${startTimeStr} - ${endTimeStr})`;
        doc.text(periodo, aptCols[0], y);
        doc.text(durationStr, aptCols[1], y);
        doc.text('-', aptCols[2], y);
        doc.text(typeLabels[serviceType] || '-', aptCols[3], y);
        doc.text(apt.is_warranty ? 'Garantia' : '-', aptCols[4], y);
        doc.text(coverageLabels[apt.coverage_type] || apt.coverage_type || 'Avulso', aptCols[5], y);

        // Técnico e valor na mesma linha à direita
        const techName = apt.user?.name || apt.technician?.name || '-';
        const price = apt.total_amount || apt.calculated_price || 0;
        doc.text(techName, aptCols[6] - 20, y);
        doc.text(`R$${price.toFixed(2)}`, aptCols[6], y);
        y += 5;

        // Descrição do apontamento
        if (apt.description) {
          const aptDesc = apt.description.replace(/<[^>]*>/g, '').trim();
          if (aptDesc) {
            doc.setFontSize(7);
            doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
            const aptLines = doc.splitTextToSize(aptDesc.toUpperCase(), pageWidth - 2 * margin - 10);
            doc.text(aptLines, margin + 3, y);
            y += aptLines.length * 3.5 + 3;
          }
        }
        y += 2;
      });

      // ===== HORAS DE ATENDIMENTO =====
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('HORAS DE ATENDIMENTO', pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Header da tabela de horas
      doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
      const hoursCols = [margin + 50, margin + 90, margin + 125, pageWidth - margin - 15];
      doc.text('EXTERNO', hoursCols[0], y + 4);
      doc.text('REMOTO', hoursCols[1], y + 4);
      doc.text('INTERNO', hoursCols[2], y + 4);
      doc.text('TOTAL', hoursCols[3], y + 4);
      y += 10;

      // Valores
      const totalHours = totalExterno + totalRemoto + totalInterno;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
      doc.text('Atendimento', margin + 5, y);
      doc.text(formatDuration(totalExterno), hoursCols[0], y);
      doc.text(formatDuration(totalRemoto), hoursCols[1], y);
      doc.text(formatDuration(totalInterno), hoursCols[2], y);
      doc.text(formatDuration(totalHours), hoursCols[3], y);
      y += 6;

      // Total
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', margin + 5, y);
      doc.text(formatDuration(totalHours), hoursCols[3], y);
      y += 12;

      // ===== TOTAL DA VALORIZAÇÃO =====
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      const totalCost = appointmentsSummary?.total_cost || 0;
      doc.text('TOTAL DA VALORIZAÇÃO AVULSA DO TICKET', margin + 30, y);
      doc.setTextColor(230, 126, 34);
      doc.text(`R$${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 30, y);
    }

    // Rodapé página 1
    doc.setFontSize(8);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text('Página 1 de 2', pageWidth - margin, pageHeight - 10, { align: 'right' });

    // ===== PÁGINA 2 - DECLARAÇÃO =====
    doc.addPage();
    y = 40;

    // Declaração
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    const declaracao = 'Declaro estar ciente do trabalho acima realizado e concordo com a realização do mesmo.';
    doc.text(declaracao, pageWidth / 2, y, { align: 'center' });
    y += 30;

    // Linha para assinatura
    doc.setDrawColor(grayColor.r, grayColor.g, grayColor.b);
    doc.line(margin + 40, y, pageWidth - margin - 40, y);
    y += 8;

    // Nome do cliente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text(t.client_name || t.client?.name || 'CLIENTE', pageWidth / 2, y, { align: 'center' });

    // Rodapé página 2
    doc.setFontSize(8);
    doc.text('Página 2 de 2', pageWidth - margin, pageHeight - 10, { align: 'right' });

    doc.save(`#${t.ticket_number}-${t.title.replace(/[^a-zA-Z0-9]/g, ' ').substring(0, 30)}.pdf`);
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

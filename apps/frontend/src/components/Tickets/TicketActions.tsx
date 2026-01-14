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
import { appointmentsService, valuationsService } from '@/services/ticket-details.service';
import { settingsService } from '@/services/settings.service';
import { Ticket } from '@/types/ticket.types';
import { ValuationCategory } from '@/types/ticket-details.types';
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

  // Buscar valorizações extras (produtos/serviços lançados)
  const { data: valuations = [] } = useQuery({
    queryKey: ['valuations', ticket.id],
    queryFn: () => valuationsService.getValuations(ticket.id),
  });

  // Buscar logos para os PDFs
  const { data: logos } = useQuery({
    queryKey: ['settings', 'logos'],
    queryFn: () => settingsService.getLogos(),
  });

  const hasAppointments = appointments.length > 0;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  // Helper para carregar imagem como base64
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

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

  // Gerar PDF de apontamento offline (preto e branco)
  const generateOfflineAppointmentPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 15;
    const t = ticket as any;

    // Labels
    const statusLabels: Record<string, string> = {
      new: 'NOVO', in_progress: 'EM ANDAMENTO', waiting_client: 'AGUARDANDO',
      paused: 'PAUSADO', resolved: 'RESOLVIDO', closed: 'FECHADO', cancelled: 'CANCELADO'
    };
    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };

    // ===== CABEÇALHO COM LOGO =====
    // Tentar carregar logo
    let logoLoaded = false;
    if (logos?.logo_report) {
      try {
        const logoBase64 = await loadImageAsBase64(`${baseUrl}${logos.logo_report}`);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, y - 5, 45, 15);
          logoLoaded = true;
        }
      } catch (e) {
        console.log('Erro ao carregar logo:', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    if (!logoLoaded) {
      doc.text(t.client_name || t.client?.name || 'Cliente', margin, y);
    }
    doc.text('SysTicket', pageWidth - margin, y, { align: 'right' });
    y += logoLoaded ? 15 : 8;

    // Linha separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Número e título do ticket
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`#${t.ticket_number} - ${t.title}`.substring(0, 70), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(statusLabels[t.status] || t.status, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // ===== INFORMAÇÕES DO CLIENTE =====
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMAÇÕES DO CLIENTE', pageWidth / 2, y + 4.5, { align: 'center' });
    y += 6;

    // Box do cliente
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, y, pageWidth - 2 * margin, 12);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Cliente:', margin + 3, y + 4);
    doc.text('Solicitante:', margin + 75, y + 4);
    doc.text('Telefone:', pageWidth - margin - 45, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text((t.client_name || '-').substring(0, 28), margin + 20, y + 4);
    doc.text((t.requester_name || '-').substring(0, 20), margin + 98, y + 4);
    doc.text(t.requester_phone || '( )', pageWidth - margin - 3, y + 4, { align: 'right' });
    y += 12;

    // ===== INFORMAÇÕES DO TICKET =====
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMAÇÕES DO TICKET', pageWidth / 2, y + 4.5, { align: 'center' });
    y += 6;

    // Box do ticket
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, y, pageWidth - 2 * margin, 12);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Mesa:', margin + 3, y + 4);
    doc.text('Responsável:', margin + 55, y + 4);
    doc.text('Aberto:', margin + 115, y + 4);
    doc.text('Prioridade:', pageWidth - margin - 30, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text((t.service_desk?.name || '-').substring(0, 15), margin + 15, y + 4);
    doc.text((t.assigned_to?.name || '-').substring(0, 15), margin + 78, y + 4);
    doc.text(new Date(t.created_at).toLocaleDateString('pt-BR'), margin + 130, y + 4);
    doc.text(priorityLabels[t.priority] || '-', pageWidth - margin - 3, y + 4, { align: 'right' });
    y += 12;

    // ===== DESCRIÇÃO DO TICKET =====
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('DESCRIÇÃO DO TICKET', pageWidth / 2, y + 4.5, { align: 'center' });
    y += 6;

    // Box da descrição
    const descText = t.description
      ? t.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      : 'Sem descrição';
    const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin - 6);
    const descHeight = Math.min(Math.max(12, descLines.length * 4 + 4), 30);

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, y, pageWidth - 2 * margin, descHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(descLines.slice(0, 6), margin + 3, y + 5);
    y += descHeight + 4;

    // ===== APONTAMENTO =====
    doc.setFillColor(180, 180, 180);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('APONTAMENTO', pageWidth / 2, y + 4.5, { align: 'center' });
    y += 10;

    // Campos para preencher
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    // Data | Hora Início | Hora Fim | Duração
    doc.text('Data: ____/____/________', margin + 3, y);
    doc.text('Início: ____:____', margin + 65, y);
    doc.text('Fim: ____:____', margin + 110, y);
    doc.text('Duração: ____:____', margin + 145, y);
    y += 10;

    // Tipo | Técnico
    doc.text('Tipo:  ( ) Remoto   ( ) Externo   ( ) Interno', margin + 3, y);
    y += 10;

    doc.text('Técnico: ___________________________________________', margin + 3, y);
    y += 12;

    // Área de descrição do serviço
    doc.text('Descrição do Serviço Realizado:', margin + 3, y);
    y += 8;

    // Linhas para escrever (8 linhas)
    doc.setDrawColor(150, 150, 150);
    for (let i = 0; i < 8; i++) {
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }

    y += 6;

    // ===== VALORIZAÇÃO =====
    doc.setFillColor(180, 180, 180);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('VALORIZAÇÃO', pageWidth / 2, y + 4.5, { align: 'center' });
    y += 10;

    // Campos de valorização em linha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Horas: ________', margin + 3, y);
    doc.text('Valor/Hora: R$ ________', margin + 55, y);
    doc.text('Total: R$ ________________', margin + 120, y);
    y += 20;

    // ===== DECLARAÇÃO E ASSINATURA =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const declaracao = 'Declaro estar ciente do trabalho acima realizado e concordo com a realização do mesmo.';
    doc.text(declaracao, pageWidth / 2, y, { align: 'center' });
    y += 20;

    // Linha para assinatura
    doc.setDrawColor(0, 0, 0);
    doc.line(margin + 40, y, pageWidth - margin - 40, y);
    y += 6;

    // Nome do cliente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(t.client_name || t.client?.name || 'CLIENTE', pageWidth / 2, y, { align: 'center' });

    // Rodapé
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - SysTicket`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Salvar PDF
    doc.save(`Apontamento_offline_${t.ticket_number}.pdf`);
  };

  // Estado para opções do relatório
  const [reportOptions, setReportOptions] = useState({
    includeDescription: true,
    includeAppointments: true,
    includeAppointmentDescription: true,
    includeValorization: true,
    includeInternalCost: false,
    includeSignature: true,
  });

  // Gerar relatório do ticket (modelo limpo e compacto)
  const generateReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 15;
    const t = ticket as any;

    // Cores (escala de cinza)
    const black = { r: 30, g: 30, b: 30 };
    const gray = { r: 100, g: 100, b: 100 };
    const lightGray = { r: 220, g: 220, b: 220 };

    // Labels
    const statusLabels: Record<string, string> = {
      new: 'Novo', in_progress: 'Em Andamento', waiting_client: 'Aguardando',
      paused: 'Pausado', resolved: 'Resolvido', closed: 'Fechado', cancelled: 'Cancelado'
    };
    const priorityLabels: Record<string, string> = {
      low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente'
    };
    const typeLabels: Record<string, string> = {
      remote: 'Remoto', on_site: 'Externo', internal: 'Interno'
    };
    const coverageLabels: Record<string, string> = {
      contract: 'Contrato', billable: 'Avulso', warranty: 'Garantia', courtesy: 'Cortesia'
    };

    // Função para formatar duração em HH:MM
    const formatDuration = (hours: number) => {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Função para formatar moeda
    const formatCurrency = (value: number) => {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Função para verificar quebra de página
    const checkPageBreak = (neededSpace: number) => {
      if (y > pageHeight - neededSpace) {
        doc.addPage();
        y = 20;
      }
    };

    // ===== CABEÇALHO COM LOGO =====
    let logoLoaded = false;
    if (logos?.logo_report) {
      try {
        const logoBase64 = await loadImageAsBase64(`${baseUrl}${logos.logo_report}`);
        if (logoBase64) {
          // Logo centralizada no topo
          doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 25, y - 5, 50, 17);
          logoLoaded = true;
          y += 15;
        }
      } catch (e) {
        console.log('Erro ao carregar logo:', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(black.r, black.g, black.b);
    doc.text('RELATORIO DE ATENDIMENTO', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Linha
    doc.setDrawColor(black.r, black.g, black.b);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ===== INFO DO TICKET =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`#${t.ticket_number}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(` - ${t.title}`.substring(0, 60), margin + 30, y);

    doc.setFontSize(9);
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text(`Status: ${statusLabels[t.status] || t.status}`, pageWidth - margin, y, { align: 'right' });
    y += 8;

    // Dados em 2 colunas compactas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(black.r, black.g, black.b);

    const col1 = margin;
    const col2 = pageWidth / 2 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text((t.client_name || t.client?.name || '-').substring(0, 35), col1 + 18, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Solicitante:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text((t.requester_name || '-').substring(0, 25), col2 + 25, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Responsável:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text((t.assigned_to?.name || '-').substring(0, 30), col1 + 28, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Prioridade:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(priorityLabels[t.priority] || '-', col2 + 24, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Aberto:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(t.created_at).toLocaleDateString('pt-BR'), col1 + 18, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Fechado:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(t.closed_at ? new Date(t.closed_at).toLocaleDateString('pt-BR') : '-', col2 + 20, y);
    y += 8;

    // ===== DESCRIÇÃO DO TICKET =====
    if (reportOptions.includeDescription && t.description) {
      doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Descrição:', margin, y);
      y += 5;

      const descText = t.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      const descLines = doc.splitTextToSize(descText, pageWidth - 2 * margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(descLines.slice(0, 8), margin, y);
      y += Math.min(descLines.length, 8) * 4 + 5;
    }

    // ===== APONTAMENTOS =====
    if (reportOptions.includeAppointments && appointments.length > 0) {
      checkPageBreak(50);
      doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(black.r, black.g, black.b);
      doc.text('Apontamentos', margin, y);
      y += 8;

      let totalHoras = 0;
      let totalValor = 0;

      appointments.forEach((apt: any, index: number) => {
        checkPageBreak(reportOptions.includeAppointmentDescription ? 35 : 20);

        const aptDate = apt.appointment_date ? new Date(apt.appointment_date) : new Date();
        const dateStr = aptDate.toLocaleDateString('pt-BR');
        const startTimeStr = apt.start_time || '00:00';
        const endTimeStr = apt.end_time || '00:00';

        let durationHours = 0;
        if (apt.duration_minutes) {
          durationHours = apt.duration_minutes / 60;
        } else {
          const [startH, startM] = startTimeStr.split(':').map(Number);
          const [endH, endM] = endTimeStr.split(':').map(Number);
          const startMinutes = (startH || 0) * 60 + (startM || 0);
          const endMinutes = (endH || 0) * 60 + (endM || 0);
          durationHours = Math.max(0, (endMinutes - startMinutes) / 60);
        }

        totalHoras += durationHours;
        const price = Number(apt.total_amount) || Number(apt.calculated_price) || 0;
        totalValor += price;

        // Fundo alternado
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          const bgHeight = reportOptions.includeAppointmentDescription && apt.description ? 18 : 12;
          doc.rect(margin, y - 3, pageWidth - 2 * margin, bgHeight, 'F');
        }

        // Linha 1: Data, Hora, Técnico, Tipo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(black.r, black.g, black.b);
        doc.text(`${dateStr}  ${startTimeStr}-${endTimeStr}`, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatDuration(durationHours)}`, margin + 55, y);
        doc.text(typeLabels[apt.service_type] || '-', margin + 75, y);
        doc.text((apt.user?.name || '-').substring(0, 15), margin + 100, y);
        doc.text(coverageLabels[apt.coverage_type] || '-', margin + 135, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(price), pageWidth - margin - 2, y, { align: 'right' });
        y += 5;

        // Descrição do apontamento
        if (reportOptions.includeAppointmentDescription && apt.description) {
          const aptDesc = apt.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          if (aptDesc) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(gray.r, gray.g, gray.b);
            const aptLines = doc.splitTextToSize(aptDesc, pageWidth - 2 * margin - 10);
            doc.text(aptLines.slice(0, 2), margin + 5, y);
            y += Math.min(aptLines.length, 2) * 3.5;
          }
        }
        y += 4;
      });

      // Linha final e total
      doc.setDrawColor(black.r, black.g, black.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(black.r, black.g, black.b);
      doc.text(`Total: ${appointments.length} apontamento(s)`, margin, y);
      doc.text(formatDuration(totalHoras), margin + 75, y);
      doc.text(formatCurrency(totalValor), pageWidth - margin - 2, y, { align: 'right' });
      y += 10;
    }

    // ===== VALORIZAÇÃO =====
    if (reportOptions.includeValorization) {
      checkPageBreak(60);
      doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(black.r, black.g, black.b);
      doc.text('Valorização', margin, y);
      y += 8;

      const totalHorasApt = appointmentsSummary?.total_hours || 0;
      const totalCustoApt = appointmentsSummary?.total_cost || 0;

      // Resumo apontamentos
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Apontamentos:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDuration(totalHorasApt)} - ${formatCurrency(totalCustoApt)}`, margin + 35, y);
      y += 6;

      // Valorizações extras (produtos/serviços lançados)
      const clientCharges = valuations.filter((v: any) => v.category === ValuationCategory.CLIENT_CHARGE);
      const internalCosts = valuations.filter((v: any) => v.category === ValuationCategory.INTERNAL_COST);

      let totalClientCharges = 0;
      if (clientCharges.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Produtos/Serviços:', margin, y);
        y += 5;

        clientCharges.forEach((val: any) => {
          checkPageBreak(10);
          const finalAmount = Number(val.final_amount) || 0;
          totalClientCharges += finalAmount;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(black.r, black.g, black.b);
          doc.text(`• ${val.description}`.substring(0, 50), margin + 5, y);
          doc.text(`${val.quantity} ${val.unit} x ${formatCurrency(val.unit_price)}`, margin + 100, y);
          doc.text(formatCurrency(finalAmount), pageWidth - margin - 2, y, { align: 'right' });
          y += 4;
        });
        y += 3;
      }

      // Total a cobrar do cliente
      const totalCobrar = totalCustoApt + totalClientCharges;
      doc.setDrawColor(black.r, black.g, black.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(black.r, black.g, black.b);
      doc.text('TOTAL A COBRAR:', margin, y);
      doc.text(formatCurrency(totalCobrar), pageWidth - margin - 2, y, { align: 'right' });
      y += 10;

      // Custos internos (se habilitado)
      if (reportOptions.includeInternalCost && internalCosts.length > 0) {
        checkPageBreak(30);
        doc.setFillColor(245, 245, 245);
        const internalHeight = 8 + internalCosts.length * 5;
        doc.rect(margin, y - 2, pageWidth - 2 * margin, internalHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(gray.r, gray.g, gray.b);
        doc.text('CUSTOS INTERNOS (uso interno)', margin + 3, y + 3);
        y += 8;

        let totalInternalCosts = 0;
        internalCosts.forEach((val: any) => {
          const finalAmount = Number(val.final_amount) || 0;
          totalInternalCosts += finalAmount;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`• ${val.description}`.substring(0, 40), margin + 5, y);
          doc.text(formatCurrency(finalAmount), pageWidth - margin - 5, y, { align: 'right' });
          y += 4;
        });

        doc.setFont('helvetica', 'bold');
        doc.text(`Total interno: ${formatCurrency(totalInternalCosts)}`, pageWidth - margin - 5, y, { align: 'right' });
        y += 8;
      }
    }

    // ===== ASSINATURA =====
    if (reportOptions.includeSignature) {
      checkPageBreak(60);
      y += 10;

      doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(gray.r, gray.g, gray.b);
      const declaracao = 'Declaro estar ciente dos serviços realizados e valores descritos acima.';
      doc.text(declaracao, pageWidth / 2, y, { align: 'center' });
      y += 20;

      // Linha assinatura
      doc.setDrawColor(black.r, black.g, black.b);
      doc.line(margin + 35, y, pageWidth - margin - 35, y);
      y += 5;

      doc.setTextColor(black.r, black.g, black.b);
      doc.text(t.client_name || t.client?.name || 'Cliente', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(gray.r, gray.g, gray.b);
      doc.text('Data: ____/____/________', pageWidth / 2, y, { align: 'center' });
    }

    // ===== RODAPÉ =====
    doc.setFontSize(7);
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - SysTicket`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`Relatorio_${t.ticket_number}.pdf`);
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
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
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Selecione as opções do relatório:
              </p>

              {/* Opções básicas */}
              <div className="space-y-3 mb-4">
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
                {reportOptions.includeAppointments && (
                  <label className="flex items-center gap-3 cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={reportOptions.includeAppointmentDescription}
                      onChange={(e) => setReportOptions({ ...reportOptions, includeAppointmentDescription: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Incluir descrição dos apontamentos</span>
                  </label>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeValorization}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeValorization: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Valorização
                    {valuations.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({valuations.filter((v: any) => v.category === ValuationCategory.CLIENT_CHARGE).length} produtos/serviços)
                      </span>
                    )}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeSignature}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeSignature: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Assinatura do cliente</span>
                </label>
              </div>

              {/* Custo Interno */}
              {valuations.filter((v: any) => v.category === ValuationCategory.INTERNAL_COST).length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportOptions.includeInternalCost}
                      onChange={(e) => setReportOptions({ ...reportOptions, includeInternalCost: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Incluir Custos Internos ({valuations.filter((v: any) => v.category === ValuationCategory.INTERNAL_COST).length})
                    </span>
                  </label>
                  <p className="ml-7 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Custos lançados na aba Valorização como "Custo Interno"
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-gray-800">
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

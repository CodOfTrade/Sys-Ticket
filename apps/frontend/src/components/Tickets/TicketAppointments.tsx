import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, Edit2, Calendar, DollarSign, Paperclip } from 'lucide-react';
import { appointmentsService } from '@/services/ticket-details.service';
import { clientService } from '@/services/client.service';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';
import { AppointmentType, ServiceCoverageType, ServiceType, ServiceLevel, CreateAppointmentDto } from '@/types/ticket-details.types';

interface TicketAppointmentsProps {
  ticketId: string;
  clientId: string;
}

const appointmentTypeLabels: Record<AppointmentType, string> = {
  [AppointmentType.SERVICE]: 'Atendimento',
  [AppointmentType.TRAVEL]: 'Deslocamento',
  [AppointmentType.MEETING]: 'Reunião',
  [AppointmentType.ANALYSIS]: 'Análise',
};

const coverageTypeLabels: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'Contrato',
  [ServiceCoverageType.WARRANTY]: 'Garantia',
  [ServiceCoverageType.BILLABLE]: 'Cobrável',
  [ServiceCoverageType.INTERNAL]: 'Interno',
};

const coverageTypeColors: Record<ServiceCoverageType, string> = {
  [ServiceCoverageType.CONTRACT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [ServiceCoverageType.WARRANTY]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ServiceCoverageType.BILLABLE]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [ServiceCoverageType.INTERNAL]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function TicketAppointments({ ticketId, clientId }: TicketAppointmentsProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    ticket_id: ticketId,
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:00',
    type: AppointmentType.SERVICE,
    coverage_type: ServiceCoverageType.BILLABLE, // Avulso por padrão
    service_type: ServiceType.REMOTE,
    service_level: ServiceLevel.N1,
    modality: ServiceType.REMOTE, // NOVO: Modalidade separada
    contract_id: '', // NOVO: ID do contrato selecionado
    is_warranty: false,
    manual_price_override: false,
    manual_unit_price: 0,
    send_as_response: false,
    attachments: [], // NOVO: Anexos/Evidências
  });

  // Estado para preço calculado
  const [calculatedPrice, setCalculatedPrice] = useState<{
    unit_price: number;
    total_amount: number;
    duration_hours: number;
    description: string;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcular preço automaticamente quando campos mudarem
  useEffect(() => {
    const calculatePrice = async () => {
      // Só calcular se o modal estiver aberto e tiver ticket_id
      if (!showCreateModal || !formData.ticket_id) return;

      // Validar campos obrigatórios
      if (!formData.start_time || !formData.end_time || !formData.modality) return;

      // Se for CONTRATO, zerar o valor (não há cobrança)
      if (formData.coverage_type === ServiceCoverageType.CONTRACT) {
        const [startHour, startMin] = formData.start_time.split(':').map(Number);
        const [endHour, endMin] = formData.end_time.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        setCalculatedPrice({
          unit_price: 0,
          total_amount: 0,
          duration_hours: durationMinutes / 60,
          description: 'Contrato - Sem cobrança',
        });
        setIsCalculating(false);
        return;
      }

      setIsCalculating(true);
      try {
        const pricing = await appointmentsService.calculatePrice({
          ticket_id: formData.ticket_id,
          start_time: formData.start_time,
          end_time: formData.end_time,
          service_type: formData.modality, // Modalidade (Remoto/Presencial/Interno)
          coverage_type: formData.coverage_type,
          is_warranty: formData.is_warranty,
          manual_price_override: formData.manual_price_override,
          manual_unit_price: formData.manual_unit_price,
        });
        setCalculatedPrice(pricing);
      } catch (error) {
        console.error('Erro ao calcular preço:', error);
        setCalculatedPrice(null);
      } finally {
        setIsCalculating(false);
      }
    };

    calculatePrice();
  }, [
    showCreateModal,
    formData.ticket_id,
    formData.start_time,
    formData.end_time,
    formData.modality,
    formData.coverage_type,
    formData.is_warranty,
    formData.manual_price_override,
    formData.manual_unit_price,
  ]);

  // Buscar apontamentos
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', ticketId],
    queryFn: () => appointmentsService.getAppointments(ticketId),
  });

  // Buscar resumo
  const { data: summary } = useQuery({
    queryKey: ['appointments-summary', ticketId],
    queryFn: () => appointmentsService.getAppointmentsSummary(ticketId),
  });

  // Buscar contratos do cliente
  const { data: clientContracts = [] } = useQuery({
    queryKey: ['client-contracts', clientId],
    queryFn: () => clientService.getClientContracts(clientId),
    enabled: !!clientId && formData.coverage_type === ServiceCoverageType.CONTRACT,
  });

  // Mutation para criar apontamento
  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentDto) => appointmentsService.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments-summary', ticketId] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  // Mutation para atualizar apontamento
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      appointmentsService.updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments-summary', ticketId] });
      setShowCreateModal(false);
      setEditingAppointment(null);
      resetForm();
    },
  });

  // Mutation para deletar apontamento
  const deleteMutation = useMutation({
    mutationFn: (appointmentId: string) => appointmentsService.deleteAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments-summary', ticketId] });
    },
  });

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment.id);
    setFormData({
      ticket_id: ticketId,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      type: appointment.type,
      coverage_type: appointment.coverage_type,
      service_type: appointment.service_type,
      service_level: appointment.service_level || ServiceLevel.N1,
      modality: appointment.service_type,
      contract_id: appointment.contract_id || '',
      is_warranty: appointment.is_warranty || false,
      manual_price_override: appointment.manual_price_override || false,
      manual_unit_price: appointment.unit_price || 0,
      description: appointment.description || '',
      send_as_response: false,
      attachments: appointment.attachments || [], // Carregar anexos existentes
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setEditingAppointment(null);
    setFormData({
      ticket_id: ticketId,
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '09:00',
      type: AppointmentType.SERVICE,
      coverage_type: ServiceCoverageType.BILLABLE,
      service_type: ServiceType.REMOTE,
      service_level: ServiceLevel.N1,
      modality: ServiceType.REMOTE,
      contract_id: '',
      is_warranty: false,
      manual_price_override: false,
      manual_unit_price: 0,
      send_as_response: false,
      attachments: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Montar DTO apenas com campos aceitos pelo backend
    const dto: any = {
      appointment_date: formData.appointment_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      description: formData.description || undefined,
    };

    // SEMPRE enviar o preço calculado (seja manual ou automático)
    if (calculatedPrice) {
      dto.unit_price = formData.manual_price_override
        ? formData.manual_unit_price
        : calculatedPrice.unit_price;
    }

    if (editingAppointment) {
      // Modo edição
      console.log('Atualizando apontamento:', editingAppointment, dto);
      updateMutation.mutate({ id: editingAppointment, data: dto });
    } else {
      // Modo criação
      const createDto: CreateAppointmentDto = {
        ...dto,
        ticket_id: formData.ticket_id,
        type: formData.type,
        coverage_type: formData.coverage_type,
        service_type: formData.modality, // Modalidade vai para service_type
        send_as_response: formData.send_as_response,
      };
      console.log('Criando apontamento:', createDto);
      createMutation.mutate(createDto);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Horas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_hours.toFixed(2)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Custo Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.total_cost)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Apontamentos ({appointments.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Apontamento
        </button>
      </div>

      {/* Lista de apontamentos */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Nenhum apontamento registrado
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      ({formatDuration(appointment.duration_minutes)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {appointmentTypeLabels[appointment.type]}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${coverageTypeColors[appointment.coverage_type]}`}
                    >
                      {coverageTypeLabels[appointment.coverage_type]}
                    </span>
                    {appointment.is_timer_based && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          Timer Automático
                        </span>
                      </>
                    )}
                    {appointment.attachments && appointment.attachments.length > 0 && (
                      <>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <Paperclip className="w-3 h-3" />
                          <span>{appointment.attachments.length}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {appointment.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {appointment.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Por: {appointment.user?.name || 'Não informado'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {formatCurrency(appointment.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditAppointment(appointment)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Deseja realmente excluir este apontamento?')) {
                        deleteMutation.mutate(appointment.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAppointment ? 'Editar Apontamento' : 'Novo Apontamento'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) =>
                        setFormData({ ...formData, appointment_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Início
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Tipo de atendimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de atendimento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.coverage_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coverage_type: e.target.value as ServiceCoverageType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={ServiceCoverageType.BILLABLE}>Avulso</option>
                    <option value={ServiceCoverageType.CONTRACT}>Contrato</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selecione "Contrato" se o cliente possui contrato ativo
                  </p>
                </div>

                {/* Tipo de contrato (dinâmico) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de contrato <span className="text-red-500">*</span>
                  </label>
                  {formData.coverage_type === ServiceCoverageType.CONTRACT ? (
                    <select
                      value={formData.contract_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contract_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Selecione um contrato</option>
                      {clientContracts.length > 0 ? (
                        clientContracts.map((contract) => (
                          <option key={contract.id} value={contract.id}>
                            {contract.descricao || contract.numero_contrato || `Contrato #${contract.id}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhum contrato encontrado</option>
                      )}
                    </select>
                  ) : (
                    <select
                      value={formData.service_type}
                      onChange={(e) =>
                        setFormData({ ...formData, service_type: e.target.value as ServiceType })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value={ServiceType.REMOTE}>Atendimento avulso N1</option>
                      <option value={ServiceType.EXTERNAL}>Atendimento avulso N2</option>
                      <option value={ServiceType.INTERNAL}>Demanda interna</option>
                    </select>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.coverage_type === ServiceCoverageType.CONTRACT
                      ? 'Contratos disponíveis para este cliente'
                      : 'Tipos de atendimento avulso cadastrados'}
                  </p>
                </div>

                {/* Modalidade (NOVO - campo separado) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modalidade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.modality}
                    onChange={(e) =>
                      setFormData({ ...formData, modality: e.target.value as ServiceType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={ServiceType.REMOTE}>Remoto</option>
                    <option value={ServiceType.EXTERNAL}>Presencial/Externo</option>
                    <option value={ServiceType.INTERNAL}>Interno</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Como o atendimento foi realizado
                  </p>
                </div>

                {/* Checkboxes de Garantia e Valor Manual */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_warranty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_warranty: e.target.checked,
                          manual_price_override: e.target.checked ? false : formData.manual_price_override,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Garantia (zera o valor)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.manual_price_override}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manual_price_override: e.target.checked,
                          is_warranty: e.target.checked ? false : formData.is_warranty,
                        })
                      }
                      disabled={formData.is_warranty}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Valor manual (editar preço manualmente)
                    </span>
                  </label>
                </div>

                {/* Campo Valor do ticket */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor do ticket {formData.manual_price_override && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      formData.manual_price_override
                        ? (formData.manual_unit_price * (calculatedPrice?.duration_hours || 1)).toFixed(2)
                        : calculatedPrice?.total_amount?.toFixed(2) || '0.00'
                    }
                    onChange={(e) => {
                      const totalValue = parseFloat(e.target.value) || 0;
                      const hours = calculatedPrice?.duration_hours || 1;
                      const unitPrice = totalValue / hours;
                      setFormData({ ...formData, manual_unit_price: unitPrice });
                    }}
                    disabled={!formData.manual_price_override || formData.is_warranty}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed font-semibold text-lg"
                    placeholder={isCalculating ? "Calculando..." : formData.is_warranty ? "R$ 0,00" : "Aguardando..."}
                    required={formData.manual_price_override}
                  />
                  {isCalculating ? (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 animate-pulse">
                      ⏳ Calculando preço...
                    </p>
                  ) : formData.is_warranty ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Garantia - Valor zerado
                    </p>
                  ) : calculatedPrice ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      💰 <strong>R$ {calculatedPrice.unit_price.toFixed(2)}/h</strong> ({formData.modality === 'remote' ? 'Remoto' : formData.modality === 'external' ? 'Presencial' : 'Interno'}) • {calculatedPrice.duration_hours.toFixed(2)}h
                      {formData.manual_price_override && (
                        <span className="text-orange-600 dark:text-orange-400 ml-1">(Valor manual)</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ⚙️ Preencha os campos para calcular
                    </p>
                  )}
                </div>

                {/* Descrição com Rich Text Editor e voz-para-texto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Descreva o trabalho realizado ou clique no microfone para falar..."
                  />
                </div>

                {/* Anexos/Evidências */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anexos/Evidências (opcional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setFormData({ ...formData, attachments: files });
                      }}
                      className="hidden"
                      id="attachment-upload"
                    />
                    <label
                      htmlFor="attachment-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Clique para selecionar arquivos ou arraste aqui
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Imagens, PDF, DOC, TXT (máx. 10MB por arquivo)
                      </span>
                    </label>
                    {formData.attachments && formData.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.attachments.map((file: File, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAttachments = formData.attachments.filter((_: File, i: number) => i !== index);
                                setFormData({ ...formData, attachments: newAttachments });
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

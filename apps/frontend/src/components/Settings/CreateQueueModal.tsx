import { useState, useEffect } from 'react';
import { X, Users, Palette, Settings as SettingsIcon, Clock } from 'lucide-react';
import { queueService } from '@/services/queue.service';
import { userService } from '@/services/user.service';
import {
  CreateQueueDto,
  DistributionStrategy,
  DISTRIBUTION_STRATEGY_LABELS,
  DISTRIBUTION_STRATEGY_DESCRIPTIONS,
  QueueSlaConfig
} from '@/types/queue.types';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const DEFAULT_SLA_CONFIG: QueueSlaConfig = {
  priorities: {
    low: { first_response: 480, resolution: 2880 },
    medium: { first_response: 240, resolution: 1440 },
    high: { first_response: 120, resolution: 480 },
    urgent: { first_response: 60, resolution: 240 },
  },
};

interface CreateQueueModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateQueueModal({ onClose, onSuccess }: CreateQueueModalProps) {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [useCustomSla, setUseCustomSla] = useState(false);
  const [slaConfig, setSlaConfig] = useState<QueueSlaConfig>(DEFAULT_SLA_CONFIG);
  const [formData, setFormData] = useState<CreateQueueDto>({
    service_desk_id: currentUser?.service_desk_id || '',
    name: '',
    description: '',
    distribution_strategy: DistributionStrategy.MANUAL,
    member_ids: [],
    color: '#3B82F6', // Blue default
    is_active: true,
    display_order: 0,
    auto_assignment_config: {
      enabled: false,
      on_ticket_create: false,
      on_ticket_status_change: false,
      max_tickets_per_member: null,
      priority_weight: false,
      skills_matching: false,
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllSimple();
      // Filter only agents and admins from current service desk
      const filtered = data.filter(
        (u: any) => (u.role === 'agent' || u.role === 'admin') &&
             u.service_desk_id === currentUser?.service_desk_id
      );
      setUsers(filtered);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Nome da fila é obrigatório');
      return;
    }

    if (!formData.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    try {
      setLoading(true);
      const dataToSend = {
        ...formData,
        sla_config: useCustomSla ? slaConfig : null,
      };
      await queueService.create(dataToSend);
      toast.success('Fila criada com sucesso');
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar fila:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar fila');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids?.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...(prev.member_ids || []), userId],
    }));
  };

  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const updateSlaPriority = (
    priority: keyof typeof slaConfig.priorities,
    field: 'first_response' | 'resolution',
    value: number
  ) => {
    setSlaConfig((prev) => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [priority]: {
          ...prev.priorities[priority],
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Nova Fila de Atendimento
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome da Fila <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex: Suporte N1, Urgências, etc."
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Descrição opcional da fila"
              />
            </div>

            {/* Estratégia de Distribuição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <SettingsIcon className="w-4 h-4 inline mr-1" />
                Estratégia de Distribuição
              </label>
              <select
                value={formData.distribution_strategy}
                onChange={(e) => setFormData({
                  ...formData,
                  distribution_strategy: e.target.value as DistributionStrategy
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.values(DistributionStrategy).map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {DISTRIBUTION_STRATEGY_LABELS[strategy]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.distribution_strategy && DISTRIBUTION_STRATEGY_DESCRIPTIONS[formData.distribution_strategy]}
              </p>
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Palette className="w-4 h-4 inline mr-1" />
                Cor da Fila
              </label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color
                        ? 'border-gray-900 dark:border-white scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                  title="Cor personalizada"
                />
              </div>
            </div>

            {/* Membros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Membros da Fila
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700">
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhum usuário disponível
                  </p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.member_ids?.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300">
                          {user.role}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selecione os agentes que farão parte desta fila
              </p>
            </div>

            {/* Atribuição Automática */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_assignment_config?.enabled || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_assignment_config: {
                        enabled: e.target.checked,
                        on_ticket_create: formData.auto_assignment_config?.on_ticket_create || false,
                        on_ticket_status_change: formData.auto_assignment_config?.on_ticket_status_change || false,
                        max_tickets_per_member: formData.auto_assignment_config?.max_tickets_per_member || null,
                        priority_weight: formData.auto_assignment_config?.priority_weight || false,
                        skills_matching: formData.auto_assignment_config?.skills_matching || false,
                      },
                    })
                  }
                  className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Habilitar atribuição automática
                </span>
              </label>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-2 ml-6">
                Quando habilitado, tickets atribuídos a esta fila serão automaticamente distribuídos
                entre os membros de acordo com a estratégia escolhida
              </p>

              {formData.auto_assignment_config?.enabled && (
                <div className="mt-3 ml-6">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Máximo de tickets por membro
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.auto_assignment_config.max_tickets_per_member || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auto_assignment_config: {
                          enabled: formData.auto_assignment_config?.enabled || false,
                          on_ticket_create: formData.auto_assignment_config?.on_ticket_create || false,
                          on_ticket_status_change: formData.auto_assignment_config?.on_ticket_status_change || false,
                          max_tickets_per_member: e.target.value ? parseInt(e.target.value) : null,
                          priority_weight: formData.auto_assignment_config?.priority_weight || false,
                          skills_matching: formData.auto_assignment_config?.skills_matching || false,
                        },
                      })
                    }
                    className="w-32 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ilimitado"
                  />
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Deixe vazio para ilimitado
                  </p>
                </div>
              )}
            </div>

            {/* SLA Personalizado */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomSla}
                  onChange={(e) => setUseCustomSla(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-2 focus:ring-orange-500"
                />
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="font-medium text-orange-900 dark:text-orange-100">
                  Usar SLA personalizado para esta fila
                </span>
              </label>
              <p className="text-xs text-orange-800 dark:text-orange-200 mt-2 ml-6">
                Se desativado, usará o SLA padrão do sistema
              </p>

              {useCustomSla && (
                <div className="mt-4 ml-6 space-y-4">
                  {Object.entries(slaConfig.priorities).map(([priority, config]) => (
                    <div
                      key={priority}
                      className="border-l-4 pl-3 py-2"
                      style={{ borderColor: PRIORITY_COLORS[priority] }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {PRIORITY_LABELS[priority]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            1ª Resposta (min)
                          </label>
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              min="1"
                              value={config.first_response}
                              onChange={(e) =>
                                updateSlaPriority(
                                  priority as keyof typeof slaConfig.priorities,
                                  'first_response',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <span className="text-xs text-gray-500">
                              {formatMinutesToHours(config.first_response)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Resolução (min)
                          </label>
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              min="1"
                              value={config.resolution}
                              onChange={(e) =>
                                updateSlaPriority(
                                  priority as keyof typeof slaConfig.priorities,
                                  'resolution',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <span className="text-xs text-gray-500">
                              {formatMinutesToHours(config.resolution)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fila ativa
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                Apenas filas ativas podem receber tickets
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Fila'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

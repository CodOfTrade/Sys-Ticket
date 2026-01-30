import { useState, useEffect } from 'react';
import { X, Users, Palette, Settings as SettingsIcon } from 'lucide-react';
import { queueService } from '@/services/queue.service';
import { userService } from '@/services/user.service';
import {
  Queue,
  UpdateQueueDto,
  DistributionStrategy,
  DISTRIBUTION_STRATEGY_LABELS,
  DISTRIBUTION_STRATEGY_DESCRIPTIONS,
  QueueMember
} from '@/types/queue.types';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

interface EditQueueModalProps {
  queue: Queue;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditQueueModal({ queue, onClose, onSuccess }: EditQueueModalProps) {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState<UpdateQueueDto>({
    name: queue.name,
    description: queue.description || '',
    distribution_strategy: queue.distribution_strategy,
    member_ids: queue.members.map(m => m.id),
    color: queue.color,
    is_active: queue.is_active,
    display_order: queue.display_order,
    auto_assignment_config: queue.auto_assignment_config || {
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
      const data = await userService.getAll();
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
    if (!formData.name?.trim()) {
      toast.error('Nome da fila é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await queueService.update(queue.id, formData);
      toast.success('Fila atualizada com sucesso');
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar fila:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar fila');
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
              Editar Fila: {queue.name}
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
                {DISTRIBUTION_STRATEGY_DESCRIPTIONS[formData.distribution_strategy!]}
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
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, Users, Settings as SettingsIcon, BarChart3, Power, PowerOff } from 'lucide-react';
import { Queue } from '@/types/queue.types';
import { DISTRIBUTION_STRATEGY_LABELS, DISTRIBUTION_STRATEGY_DESCRIPTIONS } from '@/types/queue.types';
import { EditQueueModal } from './EditQueueModal';

interface QueueCardProps {
  queue: Queue;
  onDelete: (id: string) => void;
  onToggleActive: (queue: Queue) => void;
  onUpdate: () => void;
}

export function QueueCard({ queue, onDelete, onToggleActive, onUpdate }: QueueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Color Indicator */}
            <div
              className="w-1 h-12 rounded-full"
              style={{ backgroundColor: queue.color }}
            />

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {queue.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    queue.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {queue.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              {queue.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {queue.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <SettingsIcon className="w-4 h-4" />
                  {DISTRIBUTION_STRATEGY_LABELS[queue.distribution_strategy]}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {queue.members.length} {queue.members.length === 1 ? 'membro' : 'membros'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleActive(queue)}
              className={`p-2 rounded-lg transition-colors ${
                queue.is_active
                  ? 'text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title={queue.is_active ? 'Desativar fila' : 'Ativar fila'}
            >
              {queue.is_active ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Editar fila"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(queue.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Deletar fila"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Estratégia */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Estratégia de Distribuição
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {DISTRIBUTION_STRATEGY_DESCRIPTIONS[queue.distribution_strategy]}
              </p>
            </div>

            {/* Auto Assignment Config */}
            {queue.auto_assignment_config && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Atribuição Automática
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${queue.auto_assignment_config.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-gray-600 dark:text-gray-400">
                      {queue.auto_assignment_config.enabled ? 'Habilitada' : 'Desabilitada'}
                    </span>
                  </div>
                  {queue.auto_assignment_config.max_tickets_per_member && (
                    <div className="text-gray-600 dark:text-gray-400">
                      Máx: {queue.auto_assignment_config.max_tickets_per_member} tickets/membro
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Membros */}
            {queue.members.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Membros da Fila
                </h4>
                <div className="flex flex-wrap gap-2">
                  {queue.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {member.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({member.role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditQueueModal
          queue={queue}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}

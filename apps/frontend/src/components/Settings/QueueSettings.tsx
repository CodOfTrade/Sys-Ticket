import { useState, useEffect } from 'react';
import { Plus, Layers, AlertCircle } from 'lucide-react';
import { queueService } from '@/services/queue.service';
import { Queue } from '@/types/queue.types';
import { QueueCard } from './QueueCard';
import { CreateQueueModal } from './CreateQueueModal';
import { toast } from 'react-hot-toast';

export function QueueSettings() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const data = await queueService.getAll();
      setQueues(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error: any) {
      console.error('Erro ao buscar filas:', error);
      toast.error('Erro ao carregar filas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta fila?')) {
      return;
    }

    try {
      await queueService.delete(id);
      toast.success('Fila deletada com sucesso');
      fetchQueues();
    } catch (error: any) {
      console.error('Erro ao deletar fila:', error);
      toast.error(error.response?.data?.message || 'Erro ao deletar fila');
    }
  };

  const handleToggleActive = async (queue: Queue) => {
    try {
      await queueService.update(queue.id, {
        is_active: !queue.is_active,
      });
      toast.success(`Fila ${queue.is_active ? 'desativada' : 'ativada'} com sucesso`);
      fetchQueues();
    } catch (error: any) {
      console.error('Erro ao atualizar fila:', error);
      toast.error('Erro ao atualizar fila');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Filas de Atendimento
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure filas, estratégias de distribuição e gerencie membros
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Fila
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Como funcionam as Filas
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Filas permitem organizar tickets e distribuí-los automaticamente entre membros.
              Você pode escolher entre distribuição manual, round-robin (rodízio) ou balanceamento de carga.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Filas */}
      {queues.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Layers className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhuma fila cadastrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Crie sua primeira fila para começar a organizar o atendimento
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Primeira Fila
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queues.map((queue) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onUpdate={fetchQueues}
            />
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <CreateQueueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchQueues();
          }}
        />
      )}
    </div>
  );
}

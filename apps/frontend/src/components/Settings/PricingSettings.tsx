import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import pricingConfigService from '@/services/pricing-config.service';
import {
  PricingConfig,
  ServiceModality,
  SERVICE_MODALITY_LABELS,
} from '@/types/ticket-details.types';
import { ModalityConfigSection } from './ModalityConfigSection';
import { CreatePricingConfigModal } from './CreatePricingConfigModal';

export function PricingSettings() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingModalityId, setEditingModalityId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Buscar configurações de preço
  const { data: pricingConfigs = [], isLoading } = useQuery({
    queryKey: ['pricing-configs'],
    queryFn: () => pricingConfigService.getAll(),
  });

  // Mutation para atualizar configuração
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      pricingConfigService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      toast.success('Classificação atualizada com sucesso!');
      setEditingModalityId(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar classificação');
    },
  });

  // Mutation para deletar configuração
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingConfigService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      toast.success('Classificação removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover classificação. Verifique se não há apontamentos usando esta classificação.');
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta classificação?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveModality = (
    pricingConfigId: string,
    modality: ServiceModality,
    data: any,
  ) => {
    const config = pricingConfigs.find((c) => c.id === pricingConfigId);
    if (!config) return;

    const updatedModalityConfigs = config.modality_configs.map((mc) => {
      if (mc.modality === modality) {
        return { ...mc, ...data };
      }
      return mc;
    });

    updateMutation.mutate({
      id: pricingConfigId,
      data: {
        modality_configs: updatedModalityConfigs.map((mc) => ({
          modality: mc.modality,
          hourly_rate: mc.hourly_rate,
          minimum_charge: mc.minimum_charge,
          minimum_charge_threshold_minutes: mc.minimum_charge_threshold_minutes,
          charge_excess_per_minute: mc.charge_excess_per_minute,
          round_to_minutes: mc.round_to_minutes,
        })),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Configurações de Precificação
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure os valores e regras de cobrança para cada tipo de atendimento
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Classificação
        </button>
      </div>

      {/* Lista de Classificações (Accordion) */}
      <div className="space-y-3">
        {pricingConfigs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">Nenhuma classificação encontrada</p>
            <p className="text-sm">Clique em "Nova Classificação" para criar a primeira</p>
          </div>
        ) : (
          pricingConfigs.map((config) => (
            <div
              key={config.id}
              className="border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {/* Card Header (sempre visível) */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                onClick={() => toggleExpand(config.id)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedId === config.id ? 'rotate-180' : ''
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {config.name}
                    </h3>
                    {config.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {config.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      config.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {config.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(config.id);
                    }}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Remover classificação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body (expansível) */}
              {expandedId === config.id && (
                <div className="border-t dark:border-gray-700 p-4 space-y-6">
                  {/* Seção: Interno */}
                  <ModalityConfigSection
                    title="Modalidade: Interno"
                    modality={ServiceModality.INTERNAL}
                    pricingConfig={config}
                    isEditing={editingModalityId === `${config.id}-internal`}
                    onEdit={() => setEditingModalityId(`${config.id}-internal`)}
                    onSave={(data) =>
                      handleSaveModality(config.id, ServiceModality.INTERNAL, data)
                    }
                    onCancel={() => setEditingModalityId(null)}
                  />

                  {/* Seção: Remoto */}
                  <ModalityConfigSection
                    title="Modalidade: Remoto"
                    modality={ServiceModality.REMOTE}
                    pricingConfig={config}
                    isEditing={editingModalityId === `${config.id}-remote`}
                    onEdit={() => setEditingModalityId(`${config.id}-remote`)}
                    onSave={(data) =>
                      handleSaveModality(config.id, ServiceModality.REMOTE, data)
                    }
                    onCancel={() => setEditingModalityId(null)}
                  />

                  {/* Seção: Presencial externo */}
                  <ModalityConfigSection
                    title="Modalidade: Presencial externo"
                    modality={ServiceModality.EXTERNAL}
                    pricingConfig={config}
                    isEditing={editingModalityId === `${config.id}-external`}
                    onEdit={() => setEditingModalityId(`${config.id}-external`)}
                    onSave={(data) =>
                      handleSaveModality(config.id, ServiceModality.EXTERNAL, data)
                    }
                    onCancel={() => setEditingModalityId(null)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Nova Classificação */}
      {showCreateModal && (
        <CreatePricingConfigModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
          }}
        />
      )}
    </div>
  );
}

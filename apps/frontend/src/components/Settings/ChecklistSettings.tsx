import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckSquare,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/services/api';
import { ChecklistModal } from './ChecklistModal';

// Tipos
export enum ChecklistFieldType {
  TEXT = 'text',
  PARAGRAPH = 'paragraph',
  CHECKBOX = 'checkbox',
  MULTIPLE_CHOICE = 'multiple_choice',
  SINGLE_CHOICE = 'single_choice',
  CURRENCY = 'currency',
  NUMBER = 'number',
  DATE = 'date',
  FILE = 'file',
}

export interface ChecklistFieldOption {
  id: string;
  label: string;
  order: number;
}

export interface ChecklistField {
  id: string;
  label: string;
  description?: string;
  type: ChecklistFieldType;
  order: number;
  required: boolean;
  options?: ChecklistFieldOption[];
  placeholder?: string;
  min_value?: number;
  max_value?: number;
  max_length?: number;
  allowed_extensions?: string[];
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  service_desk_id?: string;
  service_desk?: {
    id: string;
    name: string;
  };
  items: ChecklistField[];
  display_order: number;
  is_active: boolean;
  is_mandatory: boolean;
  category?: string;
  client_restrictions: string[];
  catalog_restrictions: string[];
  created_at: string;
  updated_at: string;
  created_by?: {
    id: string;
    name: string;
  };
}

const FIELD_TYPE_LABELS: Record<ChecklistFieldType, string> = {
  [ChecklistFieldType.TEXT]: 'Texto',
  [ChecklistFieldType.PARAGRAPH]: 'Parágrafo',
  [ChecklistFieldType.CHECKBOX]: 'Checkbox',
  [ChecklistFieldType.MULTIPLE_CHOICE]: 'Múltipla Escolha',
  [ChecklistFieldType.SINGLE_CHOICE]: 'Escolha Única',
  [ChecklistFieldType.CURRENCY]: 'Valor Monetário',
  [ChecklistFieldType.NUMBER]: 'Número',
  [ChecklistFieldType.DATE]: 'Data',
  [ChecklistFieldType.FILE]: 'Arquivo',
};

export function ChecklistSettings() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Buscar checklists (incluindo inativos para administração)
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const response = await api.get('/v1/tickets/checklists/templates?include_inactive=true');
      return response.data.data as Checklist[];
    },
  });

  // Mutation para toggle ativo/inativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await api.patch(`/v1/tickets/checklists/templates/${id}`, { is_active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
    },
  });

  // Mutation para excluir
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/v1/tickets/checklists/templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setConfirmDelete(null);
    },
  });

  const handleCreate = () => {
    setSelectedChecklist(null);
    setIsModalOpen(true);
  };

  const handleEdit = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setIsModalOpen(true);
  };

  const handleDuplicate = (checklist: Checklist) => {
    setSelectedChecklist({
      ...checklist,
      id: '',
      name: `${checklist.name} (Cópia)`,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = (checklist: Checklist) => {
    toggleActiveMutation.mutate({
      id: checklist.id,
      is_active: !checklist.is_active,
    });
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteMutation.mutate(id);
    } else {
      setConfirmDelete(id);
      // Auto-cancel após 3 segundos
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Checklists
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Crie e gerencie checklists para padronizar o atendimento dos tickets.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Checklist
        </button>
      </div>

      {/* Lista de Checklists */}
      {checklists.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum checklist cadastrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Crie seu primeiro checklist para padronizar os atendimentos.
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const isExpanded = expandedId === checklist.id;
            const isConfirmingDelete = confirmDelete === checklist.id;

            return (
              <div
                key={checklist.id}
                className={`bg-gray-50 dark:bg-gray-900 rounded-lg border transition-all ${
                  checklist.is_active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                {/* Header do Checklist */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleExpand(checklist.id)}
                        className="mt-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {checklist.name}
                          </h3>
                          {checklist.is_mandatory && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                              Obrigatório
                            </span>
                          )}
                          {!checklist.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        {checklist.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {checklist.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{checklist.items.length} campo(s)</span>
                          {checklist.category && (
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              {checklist.category}
                            </span>
                          )}
                          {checklist.service_desk && (
                            <span>Mesa: {checklist.service_desk.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(checklist)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={checklist.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {checklist.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(checklist)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(checklist)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(checklist.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isConfirmingDelete
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={isConfirmingDelete ? 'Clique novamente para confirmar' : 'Excluir'}
                      >
                        {isConfirmingDelete ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-red-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campos do Checklist (expandido) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Campos do Checklist
                    </h4>
                    {checklist.items.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Nenhum campo configurado
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {checklist.items
                          .sort((a, b) => a.order - b.order)
                          .map((field, index) => (
                            <div
                              key={field.id}
                              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <GripVertical className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {field.label}
                                  </span>
                                  {field.required && (
                                    <span className="text-red-500 text-sm">*</span>
                                  )}
                                </div>
                                {field.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {field.description}
                                  </p>
                                )}
                              </div>
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                {FIELD_TYPE_LABELS[field.type]}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Restrições */}
                    {(checklist.client_restrictions.length > 0 ||
                      checklist.catalog_restrictions.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Restrições de Acesso
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {checklist.client_restrictions.length > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                              {checklist.client_restrictions.length} cliente(s) específico(s)
                            </span>
                          )}
                          {checklist.catalog_restrictions.length > 0 && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                              {checklist.catalog_restrictions.length} catálogo(s) específico(s)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <ChecklistModal
          checklist={selectedChecklist}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedChecklist(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['checklists'] });
            setIsModalOpen(false);
            setSelectedChecklist(null);
          }}
        />
      )}
    </div>
  );
}

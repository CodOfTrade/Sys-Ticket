import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  Clock,
  AlertCircle,
  Type,
  AlignLeft,
  List,
  CircleDot,
  DollarSign,
  Hash,
  Calendar,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { checklistsService } from '@/services/ticket-details.service';
import { AddChecklistToTicketDto, UpdateChecklistItemDto } from '@/types/ticket-details.types';
import { formatDateTime } from '@/utils/date-formatter';

interface TicketChecklistsProps {
  ticketId: string;
  readOnly?: boolean;
}

// Tipos de campos
enum ChecklistFieldType {
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

interface ChecklistFieldOption {
  id: string;
  label: string;
  order: number;
}

interface ChecklistItem {
  id: string;
  label?: string;
  title?: string;
  description?: string;
  type?: ChecklistFieldType;
  order: number;
  required?: boolean;
  options?: ChecklistFieldOption[];
  placeholder?: string;
  value?: any;
  is_filled?: boolean;
  is_completed?: boolean;
  filled_at?: Date;
  filled_by_id?: string;
  filled_by_name?: string;
  completed_at?: Date;
  completed_by_id?: string;
  completed_by_name?: string;
  notes?: string;
}

const FIELD_TYPE_ICONS: Record<string, any> = {
  text: Type,
  paragraph: AlignLeft,
  checkbox: CheckSquare,
  multiple_choice: List,
  single_choice: CircleDot,
  currency: DollarSign,
  number: Hash,
  date: Calendar,
  file: Upload,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  paragraph: 'Parágrafo',
  checkbox: 'Checkbox',
  multiple_choice: 'Múltipla Escolha',
  single_choice: 'Escolha Única',
  currency: 'Valor Monetário',
  number: 'Número',
  date: 'Data',
  file: 'Arquivo',
};

export function TicketChecklists({ ticketId, readOnly = false }: TicketChecklistsProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());

  // Buscar checklists do ticket
  const { data: ticketChecklists = [], isLoading } = useQuery({
    queryKey: ['ticket-checklists', ticketId],
    queryFn: () => checklistsService.getTicketChecklists(ticketId),
  });

  // Buscar templates disponíveis
  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => checklistsService.getTemplates(),
  });

  // Mutation para adicionar checklist ao ticket
  const addMutation = useMutation({
    mutationFn: (data: AddChecklistToTicketDto) =>
      checklistsService.addChecklistToTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklists', ticketId] });
      setShowAddModal(false);
      setSelectedTemplateId('');
    },
  });

  // Mutation para atualizar item do checklist
  const updateItemMutation = useMutation({
    mutationFn: ({ checklistId, data }: { checklistId: string; data: UpdateChecklistItemDto }) =>
      checklistsService.updateChecklistItem(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklists', ticketId] });
    },
  });

  // Mutation para remover checklist do ticket
  const removeMutation = useMutation({
    mutationFn: (checklistId: string) =>
      checklistsService.removeChecklistFromTicket(ticketId, checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklists', ticketId] });
    },
  });

  const handleAddChecklist = () => {
    if (!selectedTemplateId) return;
    addMutation.mutate({ checklist_id: selectedTemplateId });
  };

  const handleUpdateField = (
    checklistId: string,
    itemId: string,
    value: any,
    type: ChecklistFieldType = ChecklistFieldType.CHECKBOX
  ) => {
    const notes = editingValues[`${itemId}_notes`] || undefined;

    // Para checkbox, usar is_completed; para outros, usar value
    if (type === ChecklistFieldType.CHECKBOX) {
      updateItemMutation.mutate({
        checklistId,
        data: {
          item_id: itemId,
          is_completed: value,
          notes,
        },
      });
    } else {
      updateItemMutation.mutate({
        checklistId,
        data: {
          item_id: itemId,
          value,
          notes,
        },
      });
    }
  };

  const toggleExpandChecklist = (checklistId: string) => {
    const newExpanded = new Set(expandedChecklists);
    if (newExpanded.has(checklistId)) {
      newExpanded.delete(checklistId);
    } else {
      newExpanded.add(checklistId);
    }
    setExpandedChecklists(newExpanded);
  };

  const isFieldFilled = (item: ChecklistItem): boolean => {
    if (item.is_filled !== undefined) return item.is_filled;
    if (item.is_completed !== undefined) return item.is_completed;
    return false;
  };

  const getFieldValue = (item: ChecklistItem): any => {
    return item.value !== undefined ? item.value : item.is_completed;
  };

  // Renderiza o campo de acordo com seu tipo
  const renderField = (checklistId: string, item: ChecklistItem) => {
    const type = item.type || ChecklistFieldType.CHECKBOX;
    const isFilled = isFieldFilled(item);
    const currentValue = getFieldValue(item);
    const localValue = editingValues[item.id];
    const Icon = FIELD_TYPE_ICONS[type] || CheckSquare;
    const label = item.label || item.title || '';

    // Campo comum para todos os tipos: checkbox simples
    if (type === ChecklistFieldType.CHECKBOX || !type) {
      return (
        <div
          className={`p-3 rounded-lg border transition-colors ${
            isFilled
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleUpdateField(checklistId, item.id, !currentValue, type)}
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isFilled
                  ? 'bg-green-600 border-green-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
              }`}
            >
              {isFilled && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${
                    isFilled
                      ? 'text-gray-600 dark:text-gray-400 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {label}
                </span>
                {item.required && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    *
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
              )}

              {isFilled && (item.completed_by_name || item.filled_by_name) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <User className="w-4 h-4" />
                  <span>
                    Por {item.completed_by_name || item.filled_by_name} em{' '}
                    {item.completed_at || item.filled_at
                      ? formatDateTime(item.completed_at || item.filled_at!)
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Outros tipos de campo
    return (
      <div
        className={`p-3 rounded-lg border transition-colors ${
          isFilled
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 text-gray-400 mt-0.5" />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900 dark:text-white">{label}</span>
              {item.required && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  *
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {FIELD_TYPE_LABELS[type]}
              </span>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
            )}

            {/* Campos de entrada */}
            {type === ChecklistFieldType.TEXT && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localValue !== undefined ? localValue : (currentValue || '')}
                  onChange={(e) =>
                    setEditingValues({ ...editingValues, [item.id]: e.target.value })
                  }
                  onBlur={() => {
                    if (localValue !== undefined && localValue !== currentValue) {
                      handleUpdateField(checklistId, item.id, localValue, type);
                    }
                  }}
                  placeholder={item.placeholder || 'Digite aqui...'}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {type === ChecklistFieldType.PARAGRAPH && (
              <textarea
                value={localValue !== undefined ? localValue : (currentValue || '')}
                onChange={(e) =>
                  setEditingValues({ ...editingValues, [item.id]: e.target.value })
                }
                onBlur={() => {
                  if (localValue !== undefined && localValue !== currentValue) {
                    handleUpdateField(checklistId, item.id, localValue, type);
                  }
                }}
                placeholder={item.placeholder || 'Digite aqui...'}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            )}

            {type === ChecklistFieldType.NUMBER && (
              <input
                type="number"
                value={localValue !== undefined ? localValue : (currentValue || '')}
                onChange={(e) =>
                  setEditingValues({ ...editingValues, [item.id]: e.target.value })
                }
                onBlur={() => {
                  if (localValue !== undefined && localValue !== currentValue) {
                    handleUpdateField(checklistId, item.id, parseFloat(localValue) || 0, type);
                  }
                }}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            )}

            {type === ChecklistFieldType.CURRENCY && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={localValue !== undefined ? localValue : (currentValue || '')}
                  onChange={(e) =>
                    setEditingValues({ ...editingValues, [item.id]: e.target.value })
                  }
                  onBlur={() => {
                    if (localValue !== undefined && localValue !== currentValue) {
                      handleUpdateField(checklistId, item.id, parseFloat(localValue) || 0, type);
                    }
                  }}
                  placeholder="0,00"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {type === ChecklistFieldType.DATE && (
              <input
                type="date"
                value={
                  localValue !== undefined
                    ? localValue
                    : currentValue
                    ? new Date(currentValue).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  setEditingValues({ ...editingValues, [item.id]: e.target.value });
                  handleUpdateField(checklistId, item.id, e.target.value, type);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            )}

            {type === ChecklistFieldType.SINGLE_CHOICE && item.options && (
              <div className="space-y-2">
                {item.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`field_${item.id}`}
                      value={option.id}
                      checked={currentValue === option.id}
                      onChange={() => handleUpdateField(checklistId, item.id, option.id, type)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            )}

            {type === ChecklistFieldType.MULTIPLE_CHOICE && item.options && (
              <div className="space-y-2">
                {item.options.map((option) => {
                  const selectedOptions = Array.isArray(currentValue) ? currentValue : [];
                  const isSelected = selectedOptions.includes(option.id);

                  return (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const newValue = isSelected
                            ? selectedOptions.filter((id: string) => id !== option.id)
                            : [...selectedOptions, option.id];
                          handleUpdateField(checklistId, item.id, newValue, type);
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Exibição do valor preenchido */}
            {isFilled && (item.filled_by_name || item.completed_by_name) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <User className="w-4 h-4" />
                <span>
                  Preenchido por {item.filled_by_name || item.completed_by_name} em{' '}
                  {item.filled_at || item.completed_at
                    ? formatDateTime(item.filled_at || item.completed_at!)
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Checklists ({ticketChecklists.length})
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Checklist
          </button>
        )}
      </div>

      {/* Lista de checklists */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
      ) : ticketChecklists.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum checklist adicionado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ticketChecklists.map((checklist) => {
            const isExpanded = expandedChecklists.has(checklist.id) || expandedChecklists.size === 0;

            return (
              <div
                key={checklist.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Header do checklist */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => toggleExpandChecklist(checklist.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {checklist.checklist_name}
                        </h4>
                        {checklist.is_mandatory && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            <AlertCircle className="w-3 h-3" />
                            Obrigatório
                          </span>
                        )}
                        {checklist.is_completed && (
                          <span className="flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="w-4 h-4" />
                            Completo
                          </span>
                        )}
                      </div>

                      {/* Barra de progresso */}
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>
                            {checklist.completed_items} de {checklist.total_items} campos preenchidos
                          </span>
                          <span>{Number(checklist.completion_percent).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              checklist.is_completed ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${checklist.completion_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        Adicionado em {formatDateTime(checklist.created_at)}
                        {checklist.is_completed && checklist.completed_at && (
                          <span>• Concluído em {formatDateTime(checklist.completed_at)}</span>
                        )}
                      </div>
                    </div>

                    {!readOnly && (
                      <button
                        onClick={() => {
                          if (confirm('Deseja realmente remover este checklist?')) {
                            removeMutation.mutate(checklist.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items do checklist (expandido) */}
                {isExpanded && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {checklist.items
                        .sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
                        .map((item: ChecklistItem) => (
                          <div key={item.id}>{renderField(checklist.id, item)}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de adicionar checklist */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adicionar Checklist
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTemplateId('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecione um template
                  </label>
                  <div className="space-y-2">
                    {templates.map((template: any) => (
                      <label
                        key={template.id}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplateId === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={template.id}
                          checked={selectedTemplateId === template.id}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {template.name}
                            </span>
                            {template.is_mandatory && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                Obrigatório
                              </span>
                            )}
                            {template.category && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                {template.category}
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {template.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {template.items?.length || 0} campo(s)
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {templates.length === 0 && (
                    <div className="text-center text-gray-600 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum template disponível</p>
                      <p className="text-sm mt-1">
                        Crie templates em Configurações → Checklists
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedTemplateId('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddChecklist}
                    disabled={!selectedTemplateId || addMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

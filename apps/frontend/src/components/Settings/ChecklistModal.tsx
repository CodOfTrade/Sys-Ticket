import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Type,
  AlignLeft,
  CheckSquare,
  List,
  CircleDot,
  DollarSign,
  Hash,
  Calendar,
  Upload,
} from 'lucide-react';
import { api } from '@/services/api';
import {
  Checklist,
  ChecklistField,
  ChecklistFieldOption,
  ChecklistFieldType,
} from './ChecklistSettings';

// Função simples para gerar IDs únicos
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

interface ChecklistModalProps {
  checklist: Checklist | null;
  onClose: () => void;
  onSave: () => void;
}

const FIELD_TYPE_CONFIG = [
  { type: ChecklistFieldType.TEXT, label: 'Texto', icon: Type, description: 'Campo de texto curto' },
  { type: ChecklistFieldType.PARAGRAPH, label: 'Parágrafo', icon: AlignLeft, description: 'Texto longo/descrição' },
  { type: ChecklistFieldType.CHECKBOX, label: 'Checkbox', icon: CheckSquare, description: 'Marcação simples' },
  { type: ChecklistFieldType.SINGLE_CHOICE, label: 'Escolha Única', icon: CircleDot, description: 'Selecionar uma opção' },
  { type: ChecklistFieldType.MULTIPLE_CHOICE, label: 'Múltipla Escolha', icon: List, description: 'Selecionar várias opções' },
  { type: ChecklistFieldType.CURRENCY, label: 'Valor Monetário', icon: DollarSign, description: 'Valor em R$' },
  { type: ChecklistFieldType.NUMBER, label: 'Número', icon: Hash, description: 'Valor numérico' },
  { type: ChecklistFieldType.DATE, label: 'Data', icon: Calendar, description: 'Seleção de data' },
  { type: ChecklistFieldType.FILE, label: 'Arquivo', icon: Upload, description: 'Upload de arquivo' },
];

const createEmptyField = (order: number): ChecklistField => ({
  id: generateId(),
  label: '',
  description: '',
  type: ChecklistFieldType.CHECKBOX,
  order,
  required: false,
  options: [],
  placeholder: '',
});

export function ChecklistModal({ checklist, onClose, onSave }: ChecklistModalProps) {
  const isEditing = checklist?.id ? true : false;

  // Form state
  const [name, setName] = useState(checklist?.name || '');
  const [description, setDescription] = useState(checklist?.description || '');
  const [category, setCategory] = useState(checklist?.category || '');
  const [isMandatory, setIsMandatory] = useState(checklist?.is_mandatory || false);
  const [serviceDeskId, setServiceDeskId] = useState(checklist?.service_desk_id || '');
  const [fields, setFields] = useState<ChecklistField[]>(
    checklist?.items || [createEmptyField(0)]
  );
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);

  // Buscar service desks
  const { data: serviceDesks = [] } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const response = await api.get('/v1/service-desks');
      return response.data.data || [];
    },
  });

  // Mutation para criar/atualizar
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return api.patch(`/v1/tickets/checklists/templates/${checklist.id}`, data);
      }
      return api.post('/v1/tickets/checklists/templates', data);
    },
    onSuccess: () => {
      onSave();
    },
  });

  const handleAddField = (type: ChecklistFieldType) => {
    const newField = createEmptyField(fields.length);
    newField.type = type;

    // Adicionar opções padrão para campos de escolha
    if (type === ChecklistFieldType.SINGLE_CHOICE || type === ChecklistFieldType.MULTIPLE_CHOICE) {
      newField.options = [
        { id: generateId(), label: 'Opção 1', order: 0 },
        { id: generateId(), label: 'Opção 2', order: 1 },
      ];
    }

    setFields([...fields, newField]);
    setExpandedFieldId(newField.id);
    setShowAddFieldMenu(false);
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (expandedFieldId === fieldId) {
      setExpandedFieldId(null);
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<ChecklistField>) => {
    setFields(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex((f) => f.id === fieldId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

    // Atualizar order
    newFields.forEach((f, i) => {
      f.order = i;
    });

    setFields(newFields);
  };

  const handleAddOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newOption: ChecklistFieldOption = {
      id: generateId(),
      label: `Opção ${(field.options?.length || 0) + 1}`,
      order: field.options?.length || 0,
    };

    handleUpdateField(fieldId, {
      options: [...(field.options || []), newOption],
    });
  };

  const handleUpdateOption = (
    fieldId: string,
    optionId: string,
    label: string
  ) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    handleUpdateField(fieldId, {
      options: field.options?.map((o) =>
        o.id === optionId ? { ...o, label } : o
      ),
    });
  };

  const handleRemoveOption = (fieldId: string, optionId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    handleUpdateField(fieldId, {
      options: field.options?.filter((o) => o.id !== optionId),
    });
  };

  const handleSave = () => {
    const data = {
      name,
      description: description || null,
      category: category || null,
      is_mandatory: isMandatory,
      service_desk_id: serviceDeskId || null,
      items: fields.map((f, i) => ({
        ...f,
        order: i,
        label: f.label || `Campo ${i + 1}`,
      })),
      client_restrictions: [],
      catalog_restrictions: [],
    };

    saveMutation.mutate(data);
  };

  const getFieldIcon = (type: ChecklistFieldType) => {
    const config = FIELD_TYPE_CONFIG.find((c) => c.type === type);
    return config?.icon || CheckSquare;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Checklist' : 'Novo Checklist'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Informações Básicas */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome do Checklist *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Checklist de Visita Técnica"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo deste checklist..."
                rows={2}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000 caracteres</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Manutenção"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mesa de Serviço
                </label>
                <select
                  value={serviceDeskId}
                  onChange={(e) => setServiceDeskId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Todas as mesas</option>
                  {serviceDesks.map((desk: any) => (
                    <option key={desk.id} value={desk.id}>
                      {desk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Checklist Obrigatório
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  O ticket só poderá ser concluído após preencher todos os campos obrigatórios
                </p>
              </div>
            </div>
          </div>

          {/* Campos do Checklist */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Campos do Checklist
              </h3>
              <div className="relative">
                <button
                  onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Campo
                </button>

                {/* Menu de tipos de campo */}
                {showAddFieldMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    <div className="p-2">
                      {FIELD_TYPE_CONFIG.map((config) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={config.type}
                            onClick={() => handleAddField(config.type)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
                          >
                            <Icon className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {config.label}
                              </p>
                              <p className="text-xs text-gray-500">{config.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Campos */}
            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <p>Nenhum campo adicionado</p>
                <p className="text-sm">Clique em "Adicionar Campo" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const FieldIcon = getFieldIcon(field.type);
                  const isExpanded = expandedFieldId === field.id;
                  const hasOptions =
                    field.type === ChecklistFieldType.SINGLE_CHOICE ||
                    field.type === ChecklistFieldType.MULTIPLE_CHOICE;

                  return (
                    <div
                      key={field.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    >
                      {/* Header do Campo */}
                      <div className="flex items-center gap-3 p-3">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveField(field.id, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveField(field.id, 'down')}
                            disabled={index === fields.length - 1}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <FieldIcon className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              handleUpdateField(field.id, { label: e.target.value })
                            }
                            placeholder="Nome do campo"
                            className="w-full px-2 py-1 border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleUpdateField(field.id, { required: e.target.checked })
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Obrigatório
                          </label>
                          <button
                            onClick={() =>
                              setExpandedFieldId(isExpanded ? null : field.id)
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveField(field.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detalhes do Campo (expandido) */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Descrição/Ajuda
                            </label>
                            <input
                              type="text"
                              value={field.description || ''}
                              onChange={(e) =>
                                handleUpdateField(field.id, { description: e.target.value })
                              }
                              placeholder="Texto de ajuda para o usuário"
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>

                          {(field.type === ChecklistFieldType.TEXT ||
                            field.type === ChecklistFieldType.PARAGRAPH) && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) =>
                                  handleUpdateField(field.id, { placeholder: e.target.value })
                                }
                                placeholder="Texto de exemplo"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                          )}

                          {(field.type === ChecklistFieldType.NUMBER ||
                            field.type === ChecklistFieldType.CURRENCY) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Valor Mínimo
                                </label>
                                <input
                                  type="number"
                                  value={field.min_value || ''}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      min_value: e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="0"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Valor Máximo
                                </label>
                                <input
                                  type="number"
                                  value={field.max_value || ''}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, {
                                      max_value: e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="999999"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* Opções para campos de escolha */}
                          {hasOptions && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2">
                                Opções
                              </label>
                              <div className="space-y-2">
                                {field.options?.map((option, optIndex) => (
                                  <div key={option.id} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-4">
                                      {optIndex + 1}.
                                    </span>
                                    <input
                                      type="text"
                                      value={option.label}
                                      onChange={(e) =>
                                        handleUpdateOption(field.id, option.id, e.target.value)
                                      }
                                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                    <button
                                      onClick={() => handleRemoveOption(field.id, option.id)}
                                      disabled={(field.options?.length || 0) <= 2}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 disabled:opacity-30"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => handleAddOption(field.id)}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <Plus className="w-4 h-4" />
                                  Adicionar opção
                                </button>
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Click outside to close add field menu */}
      {showAddFieldMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowAddFieldMenu(false)}
        />
      )}
    </div>
  );
}

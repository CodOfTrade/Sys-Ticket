import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Trash2, Square, CheckCircle2, User, Clock } from 'lucide-react';
import { checklistsService } from '@/services/ticket-details.service';
import { AddChecklistToTicketDto, UpdateChecklistItemDto } from '@/types/ticket-details.types';

interface TicketChecklistsProps {
  ticketId: string;
}

export function TicketChecklists({ ticketId }: TicketChecklistsProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState<{ [key: string]: string }>({});

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

  const handleToggleItem = (checklistId: string, itemId: string, currentStatus: boolean) => {
    const notes = editingItemNotes[itemId] || undefined;
    updateItemMutation.mutate({
      checklistId,
      data: {
        item_id: itemId,
        is_completed: !currentStatus,
        notes,
      },
    });
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Checklists ({ticketChecklists.length})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Checklist
        </button>
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
          {ticketChecklists.map((checklist) => (
            <div
              key={checklist.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Header do checklist */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {checklist.checklist_name}
                      </h4>
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
                          {checklist.completed_items} de {checklist.total_items} itens concluídos
                        </span>
                        <span>{checklist.completion_percent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            checklist.is_completed
                              ? 'bg-green-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${checklist.completion_percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      Adicionado em {formatDate(checklist.created_at)}
                      {checklist.is_completed && checklist.completed_at && (
                        <span>• Concluído em {formatDate(checklist.completed_at)}</span>
                      )}
                    </div>
                  </div>

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
                </div>
              </div>

              {/* Items do checklist */}
              <div className="p-4">
                <div className="space-y-3">
                  {checklist.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        item.is_completed
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() =>
                            handleToggleItem(checklist.id, item.id, item.is_completed)
                          }
                          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            item.is_completed
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                          }`}
                        >
                          {item.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-transparent" />
                          )}
                        </button>

                        {/* Conteúdo do item */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-medium ${
                                    item.is_completed
                                      ? 'text-gray-600 dark:text-gray-400 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {item.required && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                    Obrigatório
                                  </span>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {item.description}
                                </p>
                              )}

                              {item.is_completed && item.completed_by_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  <User className="w-4 h-4" />
                                  <span>
                                    Concluído por {item.completed_by_name} em{' '}
                                    {item.completed_at && formatDate(item.completed_at)}
                                  </span>
                                </div>
                              )}

                              {/* Notas do item */}
                              {item.is_completed && item.notes && (
                                <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>Observações:</strong> {item.notes}
                                  </p>
                                </div>
                              )}

                              {/* Campo para adicionar notas */}
                              {!item.is_completed && (
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    placeholder="Adicionar observações (opcional)"
                                    value={editingItemNotes[item.id] || ''}
                                    onChange={(e) =>
                                      setEditingItemNotes({
                                        ...editingItemNotes,
                                        [item.id]: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
                    {templates.map((template) => (
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
                            {template.items.length} item(ns)
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {templates.length === 0 && (
                    <p className="text-center text-gray-600 dark:text-gray-400 py-4">
                      Nenhum template disponível
                    </p>
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

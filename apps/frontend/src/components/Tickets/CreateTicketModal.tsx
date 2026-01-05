import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticket.service';
import { TicketPriority, ServiceType, CreateTicketDto } from '@/types/ticket.types';
import { useAuthStore } from '@/store/auth.store';
import { serviceCatalogService } from '@/services/service-catalog.service';
import { clientService } from '@/services/client.service';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    service_type: ServiceType.REMOTE,
    service_catalog_id: '',
    client_id: '',
    client_name: '',
    contact_id: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    category: '',
  });

  // Buscar catálogos de serviço
  const { data: catalogs } = useQuery({
    queryKey: ['service-catalogs', user?.service_desk_id],
    queryFn: () => serviceCatalogService.getAll(user?.service_desk_id),
    enabled: isOpen,
  });

  // Buscar contatos do cliente
  const { data: contacts } = useQuery({
    queryKey: ['client-contacts', formData.client_id],
    queryFn: () => clientService.getContacts(formData.client_id),
    enabled: !!formData.client_id,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateTicketDto) => ticketService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Erro ao criar ticket:', error);
      if (error.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.field] = err.message;
        });
        setErrors(newErrors);
      }
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: TicketPriority.MEDIUM,
      service_type: ServiceType.REMOTE,
      service_catalog_id: '',
      client_id: '',
      client_name: '',
      contact_id: '',
      requester_name: '',
      requester_email: '',
      requester_phone: '',
      category: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.service_catalog_id) {
      newErrors.service_catalog_id = 'Catálogo de serviço é obrigatório';
    }

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Nome do cliente é obrigatório';
    }

    if (!formData.requester_name.trim()) {
      newErrors.requester_name = 'Nome do solicitante é obrigatório';
    }

    if (formData.requester_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requester_email)) {
      newErrors.requester_email = 'E-mail inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Usar service_desk_id do usuário logado
    const serviceDeskId = user?.service_desk_id || '3d316765-6615-4082-9bb7-d7d6a266db09';

    const ticketData: any = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      type: formData.service_type,
      service_catalog_id: formData.service_catalog_id,
      client_id: formData.client_id || 'CLI-' + Date.now(), // Gerar ID temporário se não houver
      client_name: formData.client_name,
      requester_name: formData.requester_name,
      service_desk_id: serviceDeskId,
    };

    // Adicionar campos opcionais apenas se preenchidos
    if (formData.contact_id) {
      ticketData.contact_id = formData.contact_id;
    }
    if (formData.requester_email) {
      ticketData.requester_email = formData.requester_email;
    }
    if (formData.requester_phone) {
      ticketData.requester_phone = formData.requester_phone;
    }
    if (formData.category) {
      ticketData.category = formData.category;
    }

    await createMutation.mutateAsync(ticketData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Ticket</h2>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações do Ticket */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informações do Ticket
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.title
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Descreva o problema brevemente"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.description
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Descreva o problema em detalhes"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catálogo de Serviço <span className="text-red-500">*</span>
                </label>
                <select
                  name="service_catalog_id"
                  value={formData.service_catalog_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.service_catalog_id
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Selecione um catálogo</option>
                  {catalogs?.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                {errors.service_catalog_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.service_catalog_id}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioridade <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={TicketPriority.LOW}>Baixa</option>
                    <option value={TicketPriority.MEDIUM}>Média</option>
                    <option value={TicketPriority.HIGH}>Alta</option>
                    <option value={TicketPriority.URGENT}>Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Serviço <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={ServiceType.REMOTE}>Remoto</option>
                    <option value={ServiceType.INTERNAL}>Interno</option>
                    <option value={ServiceType.EXTERNAL}>Externo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Hardware, Software"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informações do Cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.client_name
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Nome da empresa ou cliente"
                />
                {errors.client_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Solicitante
                </label>
                <select
                  name="contact_id"
                  value={formData.contact_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!formData.client_id}
                >
                  <option value="">Selecione um contato existente</option>
                  {contacts?.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.email ? `- ${contact.email}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Caso não encontre o contato, preencha os dados manualmente abaixo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Solicitante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="requester_name"
                  value={formData.requester_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.requester_name
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Nome da pessoa que solicitou"
                />
                {errors.requester_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.requester_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-mail do Solicitante
                  </label>
                  <input
                    type="email"
                    name="requester_email"
                    value={formData.requester_email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.requester_email
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="email@exemplo.com"
                  />
                  {errors.requester_email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.requester_email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefone do Solicitante
                  </label>
                  <input
                    type="tel"
                    name="requester_phone"
                    value={formData.requester_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Criando...
                </>
              ) : (
                'Criar Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

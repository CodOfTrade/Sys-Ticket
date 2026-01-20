import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Loader2 } from 'lucide-react';
import {
  serviceCatalogService,
  ServiceCatalog,
  CreateServiceCatalogDto,
} from '@/services/service-catalog.service';

interface ServiceCatalogModalProps {
  catalog: ServiceCatalog | null;
  serviceDeskId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function ServiceCatalogModal({
  catalog,
  serviceDeskId,
  onClose,
  onSave,
}: ServiceCatalogModalProps) {
  const isEditing = !!catalog?.id;

  const [formData, setFormData] = useState<CreateServiceCatalogDto>({
    name: '',
    description: '',
    code: '',
    service_desk_id: serviceDeskId || '',
    requires_approval: false,
    is_billable: true,
    default_price: undefined,
    estimated_time: undefined,
    display_order: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (catalog) {
      setFormData({
        name: catalog.name,
        description: catalog.description || '',
        code: catalog.code || '',
        service_desk_id: catalog.service_desk_id,
        requires_approval: catalog.requires_approval,
        is_billable: catalog.is_billable,
        default_price: catalog.default_price,
        estimated_time: catalog.estimated_time,
        display_order: catalog.display_order,
      });
    }
  }, [catalog]);

  const createMutation = useMutation({
    mutationFn: (data: CreateServiceCatalogDto) => serviceCatalogService.create(data),
    onSuccess: () => {
      onSave();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateServiceCatalogDto>) =>
      serviceCatalogService.update(catalog!.id, data),
    onSuccess: () => {
      onSave();
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = value ? parseFloat(value) : undefined;
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.service_desk_id) {
      newErrors.service_desk_id = 'Mesa de serviço é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Catálogo de Serviço' : 'Novo Catálogo de Serviço'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Suporte Técnico"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.name
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ex: SUP-TEC"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Código único para identificação rápida (opcional)
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva o tipo de serviço oferecido..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tempo Estimado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tempo Estimado (minutos)
              </label>
              <input
                type="number"
                name="estimated_time"
                value={formData.estimated_time || ''}
                onChange={handleChange}
                min={0}
                placeholder="Ex: 60"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Preço Padrão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preço Padrão (R$)
              </label>
              <input
                type="number"
                name="default_price"
                value={formData.default_price || ''}
                onChange={handleChange}
                min={0}
                step={0.01}
                placeholder="Ex: 150.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Ordem de Exibição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ordem de Exibição
              </label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_billable"
                checked={formData.is_billable}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  É faturável
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Marque se este serviço deve ser cobrado
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="requires_approval"
                checked={formData.requires_approval}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Requer aprovação
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tickets deste tipo precisam ser aprovados antes de iniciar
                </p>
              </div>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isEditing ? 'Salvar Alterações' : 'Criar Catálogo'}
          </button>
        </div>
      </div>
    </div>
  );
}

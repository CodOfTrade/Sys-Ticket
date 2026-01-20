import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Tag,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  serviceCatalogService,
  ServiceCatalog,
  ServiceCategory,
} from '@/services/service-catalog.service';
import { ServiceCatalogModal } from './ServiceCatalogModal';
import { ServiceCategoryModal } from './ServiceCategoryModal';

export function ServiceCatalogSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const serviceDeskId = user?.service_desk_id;

  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<ServiceCatalog | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedCatalogForCategory, setSelectedCatalogForCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

  // Buscar catálogos (incluindo inativos para administração)
  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ['service-catalogs', serviceDeskId],
    queryFn: () => serviceCatalogService.getAllIncludingInactive(serviceDeskId),
  });

  // Mutation para toggle ativo/inativo do catálogo
  const toggleCatalogActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return serviceCatalogService.update(id, { is_active } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
    },
  });

  // Mutation para excluir catálogo
  const deleteCatalogMutation = useMutation({
    mutationFn: (id: string) => serviceCatalogService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
      setConfirmDelete(null);
    },
  });

  // Mutation para toggle ativo/inativo da categoria
  const toggleCategoryActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return serviceCatalogService.updateCategory(id, { is_active } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
    },
  });

  // Mutation para excluir categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => serviceCatalogService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
      setConfirmDeleteCategory(null);
    },
  });

  const handleCreateCatalog = () => {
    setSelectedCatalog(null);
    setIsCatalogModalOpen(true);
  };

  const handleEditCatalog = (catalog: ServiceCatalog) => {
    setSelectedCatalog(catalog);
    setIsCatalogModalOpen(true);
  };

  const handleToggleCatalogActive = (catalog: ServiceCatalog) => {
    toggleCatalogActiveMutation.mutate({
      id: catalog.id,
      is_active: !catalog.is_active,
    });
  };

  const handleDeleteCatalog = (id: string) => {
    if (confirmDelete === id) {
      deleteCatalogMutation.mutate(id);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleCreateCategory = (catalogId: string) => {
    setSelectedCategory(null);
    setSelectedCatalogForCategory(catalogId);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setSelectedCatalogForCategory(category.service_catalog_id);
    setIsCategoryModalOpen(true);
  };

  const handleToggleCategoryActive = (category: ServiceCategory) => {
    toggleCategoryActiveMutation.mutate({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (confirmDeleteCategory === id) {
      deleteCategoryMutation.mutate(id);
    } else {
      setConfirmDeleteCategory(id);
      setTimeout(() => setConfirmDeleteCategory(null), 3000);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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
            Catálogos de Serviço
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gerencie os catálogos de serviço e suas categorias para organizar os tipos de atendimento.
          </p>
        </div>
        <button
          onClick={handleCreateCatalog}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Catálogo
        </button>
      </div>

      {/* Lista de Catálogos */}
      {catalogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum catálogo cadastrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Crie seu primeiro catálogo de serviço para organizar os tipos de atendimento.
          </p>
          <button
            onClick={handleCreateCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {catalogs.map((catalog) => {
            const isExpanded = expandedId === catalog.id;
            const isConfirmingDelete = confirmDelete === catalog.id;
            const categories = catalog.categories || [];

            return (
              <div
                key={catalog.id}
                className={`bg-gray-50 dark:bg-gray-900 rounded-lg border transition-all ${
                  catalog.is_active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                {/* Header do Catálogo */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleExpand(catalog.id)}
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
                            {catalog.name}
                          </h3>
                          {catalog.code && (
                            <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                              {catalog.code}
                            </span>
                          )}
                          {catalog.requires_approval && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                              Requer Aprovação
                            </span>
                          )}
                          {!catalog.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        {catalog.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {catalog.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {categories.length} categoria(s)
                          </span>
                          {catalog.is_billable && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatPrice(catalog.default_price)}
                            </span>
                          )}
                          {catalog.estimated_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(catalog.estimated_time)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCatalogActive(catalog)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={catalog.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {catalog.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditCatalog(catalog)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteCatalog(catalog.id)}
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

                {/* Categorias do Catálogo (expandido) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Categorias
                      </h4>
                      <button
                        onClick={() => handleCreateCategory(catalog.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Categoria
                      </button>
                    </div>

                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center">
                        Nenhuma categoria cadastrada. Adicione categorias para organizar os tipos de serviço.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {categories
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((category) => {
                            const isConfirmingCategoryDelete = confirmDeleteCategory === category.id;

                            return (
                              <div
                                key={category.id}
                                className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border transition-all ${
                                  category.is_active
                                    ? 'border-gray-200 dark:border-gray-600'
                                    : 'border-gray-200 dark:border-gray-600 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {category.color && (
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: category.color }}
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {category.name}
                                      </span>
                                      {category.code && (
                                        <span className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                          {category.code}
                                        </span>
                                      )}
                                      {!category.is_active && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                          Inativo
                                        </span>
                                      )}
                                    </div>
                                    {category.description && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {category.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleToggleCategoryActive(category)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    title={category.is_active ? 'Desativar' : 'Ativar'}
                                  >
                                    {category.is_active ? (
                                      <ToggleRight className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <ToggleLeft className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleEditCategory(category)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className={`p-1.5 rounded transition-colors ${
                                      isConfirmingCategoryDelete
                                        ? 'bg-red-100 dark:bg-red-900/30'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    title={isConfirmingCategoryDelete ? 'Clique novamente para confirmar' : 'Excluir'}
                                  >
                                    {isConfirmingCategoryDelete ? (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    ) : (
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação/Edição de Catálogo */}
      {isCatalogModalOpen && (
        <ServiceCatalogModal
          catalog={selectedCatalog}
          serviceDeskId={serviceDeskId}
          onClose={() => {
            setIsCatalogModalOpen(false);
            setSelectedCatalog(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
            setIsCatalogModalOpen(false);
            setSelectedCatalog(null);
          }}
        />
      )}

      {/* Modal de Criação/Edição de Categoria */}
      {isCategoryModalOpen && selectedCatalogForCategory && (
        <ServiceCategoryModal
          category={selectedCategory}
          catalogId={selectedCatalogForCategory}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setSelectedCategory(null);
            setSelectedCatalogForCategory(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['service-catalogs'] });
            setIsCategoryModalOpen(false);
            setSelectedCategory(null);
            setSelectedCatalogForCategory(null);
          }}
        />
      )}
    </div>
  );
}

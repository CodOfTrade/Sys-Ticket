import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Trash2, Edit2, Package, CheckCircle, XCircle, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { valuationsService } from '@/services/ticket-details.service';
import { ValuationType, ValuationCategory, CreateValuationDto } from '@/types/ticket-details.types';
import { sigeProductsService, SigeProduct } from '@/services/sige-products.service';

interface TicketValuationProps {
  ticketId: string;
  readOnly?: boolean;
}

const valuationTypeLabels: Record<ValuationType, string> = {
  [ValuationType.PRODUCT]: 'Produto',
  [ValuationType.SERVICE]: 'Serviço',
  [ValuationType.EXTRA]: 'Extra',
  [ValuationType.DISCOUNT]: 'Desconto',
};

const valuationCategoryLabels: Record<ValuationCategory, string> = {
  [ValuationCategory.CLIENT_CHARGE]: 'Cobrança ao Cliente',
  [ValuationCategory.INTERNAL_COST]: 'Custo Interno',
};

const valuationCategoryColors: Record<ValuationCategory, string> = {
  [ValuationCategory.CLIENT_CHARGE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ValuationCategory.INTERNAL_COST]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function TicketValuation({ ticketId, readOnly = false }: TicketValuationProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<ValuationCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateValuationDto>({
    ticket_id: ticketId,
    type: ValuationType.PRODUCT,
    category: ValuationCategory.CLIENT_CHARGE,
    description: '',
    valuation_date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit: 'un',
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 0,
  });

  // Autocomplete states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState<SigeProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Buscar valorizações
  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['valuations', ticketId, selectedCategory],
    queryFn: () =>
      valuationsService.getValuations(ticketId, selectedCategory !== 'all' ? selectedCategory : undefined),
  });

  // Buscar resumo
  const { data: summary } = useQuery({
    queryKey: ['valuations-summary', ticketId],
    queryFn: () => valuationsService.getValuationSummary(ticketId),
  });

  // Mutation para criar valorização
  const createMutation = useMutation({
    mutationFn: (data: CreateValuationDto) => valuationsService.createValuation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['valuations', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['valuations-summary', ticketId] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  // Mutation para deletar valorização
  const deleteMutation = useMutation({
    mutationFn: (valuationId: string) => valuationsService.deleteValuation(valuationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['valuations', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['valuations-summary', ticketId] });
    },
  });

  // Mutation para aprovar/rejeitar valorização
  const approveMutation = useMutation({
    mutationFn: ({ valuationId, isApproved }: { valuationId: string; isApproved: boolean }) =>
      valuationsService.approveValuation(valuationId, isApproved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['valuations', ticketId] });
    },
  });

  // Debounced product search
  useEffect(() => {
    if (productSearchQuery.trim().length < 2) {
      setProductSuggestions([]);
      setShowProductSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await sigeProductsService.searchProducts(productSearchQuery, 1, 10);
        setProductSuggestions(response.data || []);
        setShowProductSuggestions(true);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setProductSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (product: SigeProduct) => {
    // Converter preço de string para número
    const price = typeof product.preco_venda === 'string'
      ? parseFloat(product.preco_venda)
      : (product.preco_venda || 0);

    setFormData({
      ...formData,
      description: product.nome,
      unit: product.unidade || 'un',
      unit_price: price,
      sige_product_code: product.codigo,
      sige_product_name: product.nome,
    });
    setProductSearchQuery(product.nome);
    setShowProductSuggestions(false);
  };

  const resetForm = () => {
    setFormData({
      ticket_id: ticketId,
      type: ValuationType.PRODUCT,
      category: ValuationCategory.CLIENT_CHARGE,
      description: '',
      valuation_date: new Date().toISOString().split('T')[0],
      quantity: 1,
      unit: 'un',
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 0,
    });
    setProductSearchQuery('');
    setProductSuggestions([]);
    setShowProductSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cobranças ao Cliente</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.client_charges)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Custos Internos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.internal_costs)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e botão adicionar */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Todos
          </button>
          {Object.entries(valuationCategoryLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value as ValuationCategory)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Valorização
          </button>
        )}
      </div>

      {/* Lista de valorizações */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
      ) : valuations.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma valorização encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {valuations.map((valuation) => (
            <div
              key={valuation.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {valuation.description}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${valuationCategoryColors[valuation.category]}`}>
                      {valuationCategoryLabels[valuation.category]}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {valuationTypeLabels[valuation.type]}
                    </span>
                    {valuation.requires_approval && !valuation.is_approved && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        Aguardando Aprovação
                      </span>
                    )}
                    {valuation.is_approved && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Aprovado
                      </span>
                    )}
                  </div>

                  {valuation.sige_product_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <Package className="w-4 h-4" />
                      {valuation.sige_product_code && `[${valuation.sige_product_code}] `}
                      {valuation.sige_product_name}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Data:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate(valuation.valuation_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Quantidade:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {valuation.quantity} {valuation.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Valor Unit.:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatCurrency(valuation.unit_price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatCurrency(valuation.total_amount)}
                      </span>
                    </div>
                  </div>

                  {(valuation.discount_percent > 0 || valuation.tax_percent > 0) && (
                    <div className="flex gap-4 text-sm mt-2">
                      {valuation.discount_percent > 0 && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                          <span className="ml-2 text-red-600 dark:text-red-400">
                            {valuation.discount_percent}% ({formatCurrency(valuation.discount_amount)})
                          </span>
                        </div>
                      )}
                      {valuation.tax_percent > 0 && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Imposto:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {valuation.tax_percent}% ({formatCurrency(valuation.tax_amount)})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Valor Final:</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(valuation.final_amount)}
                      </span>
                    </div>
                  </div>

                  {valuation.notes && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Observações:</strong> {valuation.notes}
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-2 ml-4">
                    {valuation.requires_approval && !valuation.is_approved && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate({ valuationId: valuation.id, isApproved: true })}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Aprovar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => approveMutation.mutate({ valuationId: valuation.id, isApproved: false })}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Rejeitar"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Deseja realmente excluir esta valorização?')) {
                          deleteMutation.mutate(valuation.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nova Valorização
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ValuationCategory })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(valuationCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative" ref={autocompleteRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar Produto
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setFormData({ ...formData, description: e.target.value });
                      }}
                      placeholder="Digite para buscar produtos do SIGE..."
                      className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions dropdown */}
                  {showProductSuggestions && productSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productSuggestions.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {product.nome}
                              </div>
                              {product.codigo && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Código: {product.codigo}
                                </div>
                              )}
                              {product.descricao && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                  {product.descricao}
                                </div>
                              )}
                            </div>
                            {product.preco_venda && (
                              <div className="ml-3 text-sm font-semibold text-green-600 dark:text-green-400">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(product.preco_venda)}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showProductSuggestions && productSuggestions.length === 0 && !isSearching && productSearchQuery.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.valuation_date}
                    onChange={(e) => setFormData({ ...formData, valuation_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preço Unitário
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Imposto (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax_percent}
                      onChange={(e) => setFormData({ ...formData, tax_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Client } from '@services/client.service';
import { contractService } from '@services/contract.service';
import ClientRequesters from './ClientRequesters';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
}

type TabType = 'info' | 'requesters' | 'contracts';

export default function ClientDetails({ client, onClose }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Buscar contratos do cliente (usando localId se disponível)
  const clientIdForContracts = client.localId || client.id;
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts', 'client', clientIdForContracts],
    queryFn: () => contractService.getByClient(clientIdForContracts),
    enabled: activeTab === 'contracts' && !!clientIdForContracts,
  });

  const formatDocument = (doc?: string) => {
    if (!doc) return '-';
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: '📋' },
    { id: 'requesters', label: 'Solicitantes', icon: '👥' },
    { id: 'contracts', label: 'Contratos', icon: '📄' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-start pl-[280px] pt-32 pr-8 pb-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full h-full overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.nome}
              </h2>
              {client.razao_social && client.razao_social !== client.nome && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {client.razao_social}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <p className="text-gray-900 dark:text-white">{client.nome || '-'}</p>
                </div>

                {client.razao_social && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Razão Social
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.razao_social}</p>
                  </div>
                )}

                {client.nome_fantasia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Fantasia
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.nome_fantasia}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF/CNPJ
                  </label>
                  <p className="text-gray-900 dark:text-white">{formatDocument(client.cpf_cnpj)}</p>
                </div>

                {client.tipo_pessoa && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de Pessoa
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {client.tipo_pessoa === 'F' ? 'Física' : 'Jurídica'}
                    </p>
                  </div>
                )}

                {client.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{client.email}</p>
                  </div>
                )}

                {client.telefone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatPhone(client.telefone)}</p>
                  </div>
                )}

                {client.celular && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Celular
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatPhone(client.celular)}</p>
                  </div>
                )}
              </div>

              {client.endereco && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço
                  </label>
                  <p className="text-gray-900 dark:text-white">{client.endereco}</p>
                  {(client.cidade || client.estado || client.cep) && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {[client.cidade, client.estado, client.cep].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requesters' && (
            <ClientRequesters clientId={clientIdForContracts} />
          )}

          {activeTab === 'contracts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Contratos
                </h3>
              </div>

              {loadingContracts ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum contrato encontrado
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {contract.numero_contrato && (
                              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                {contract.numero_contrato}
                              </span>
                            )}
                            {contract.status && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                contract.status === 'ativo' || contract.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {contract.status}
                              </span>
                            )}
                            {contract.tipo && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {contract.tipo}
                              </span>
                            )}
                          </div>

                          {contract.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {contract.descricao}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {contract.valor_mensal && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Valor Mensal:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatCurrency(contract.valor_mensal)}
                                </span>
                              </div>
                            )}
                            {contract.data_inicio && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Início:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatDate(contract.data_inicio)}
                                </span>
                              </div>
                            )}
                            {contract.data_fim && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Fim:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                  {formatDate(contract.data_fim)}
                                </span>
                              </div>
                            )}
                          </div>

                          {contract.observacoes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações:</span>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {contract.observacoes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

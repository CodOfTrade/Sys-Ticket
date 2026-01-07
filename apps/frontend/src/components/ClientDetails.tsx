import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Client } from '@services/client.service';
import { requesterService, type CreateRequesterDto } from '@services/requester.service';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
}

type TabType = 'info' | 'requesters' | 'tickets' | 'contracts';

export default function ClientDetails({ client, onClose }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showRequesterForm, setShowRequesterForm] = useState(false);
  const [requesterForm, setRequesterForm] = useState<CreateRequesterDto>({
    client_id: client.id,
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
  });
  const queryClient = useQueryClient();

  // Buscar solicitantes do cliente
  const { data: requesters = [], isLoading: loadingRequesters } = useQuery({
    queryKey: ['requesters', client.id],
    queryFn: () => requesterService.findByClient(client.id),
    enabled: activeTab === 'requesters',
  });

  // Mutation para criar solicitante
  const createRequesterMutation = useMutation({
    mutationFn: requesterService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requesters', client.id] });
      setShowRequesterForm(false);
      setRequesterForm({
        client_id: client.id,
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
      });
    },
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

  const tabs = [
    { id: 'info', label: 'Informações', icon: '📋' },
    { id: 'requesters', label: 'Solicitantes', icon: '👥' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'contracts', label: 'Contratos', icon: '📄' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Solicitantes
                </h3>
                <button
                  onClick={() => setShowRequesterForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Adicionar Solicitante
                </button>
              </div>

              {/* Formulário de adicionar solicitante */}
              {showRequesterForm && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Novo Solicitante</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={requesterForm.name}
                        onChange={(e) => setRequesterForm({ ...requesterForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={requesterForm.email}
                        onChange={(e) => setRequesterForm({ ...requesterForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={requesterForm.phone}
                        onChange={(e) => setRequesterForm({ ...requesterForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={requesterForm.position}
                        onChange={(e) => setRequesterForm({ ...requesterForm, position: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => createRequesterMutation.mutate(requesterForm)}
                      disabled={!requesterForm.name || createRequesterMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                      {createRequesterMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRequesterForm(false);
                        setRequesterForm({
                          client_id: client.id,
                          name: '',
                          email: '',
                          phone: '',
                          department: '',
                          position: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de solicitantes */}
              {loadingRequesters ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : requesters.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum solicitante cadastrado
                </div>
              ) : (
                <div className="space-y-3">
                  {requesters.map((requester) => (
                    <div
                      key={requester.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {requester.name}
                            {requester.is_primary && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Principal
                              </span>
                            )}
                          </h4>
                          {requester.position && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {requester.position}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            {requester.email && (
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Email:</span> {requester.email}
                              </p>
                            )}
                            {requester.phone && (
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Telefone:</span> {requester.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tickets do Cliente
              </h3>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Nenhum ticket encontrado
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contratos
              </h3>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Nenhum contrato encontrado
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Editar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}

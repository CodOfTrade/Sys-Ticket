import { useQuery } from '@tanstack/react-query';
import { Download, Package, Monitor, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { formatDateTime } from '@/utils/date-formatter';

interface VersionsData {
  latest: string;
  files: {
    installer: string;
    portable: string;
  };
  updatedAt?: string;
  available: boolean;
  installerAvailable?: boolean;
  portableAvailable?: boolean;
  message?: string;
}

export default function AgentDownload() {
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const { data: versionsData, isLoading, error } = useQuery<VersionsData>({
    queryKey: ['agent-versions'],
    queryFn: async () => {
      const response = await api.get('/v1/downloads/agent/versions');
      return response.data.data;
    },
  });

  const handleDownload = (type: 'installer' | 'portable') => {
    const url = `${apiUrl}/v1/downloads/agent/${type}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Download do Agente
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Baixe e instale o agente de monitoramento nos computadores dos clientes
        </p>
      </div>

      {/* Versão e Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sys-Ticket Agent
            </h2>
            {isLoading ? (
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                <span>Carregando informações...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 mt-1 text-red-500">
                <XCircle size={16} />
                <span>Erro ao carregar versões</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 mt-1">
                <span className="text-gray-600 dark:text-gray-400">
                  Versão: <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {versionsData?.latest || '1.0.0'}
                  </span>
                </span>
                {versionsData?.available ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle size={14} />
                    Disponível
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                    <XCircle size={14} />
                    Build pendente
                  </span>
                )}
              </div>
            )}
            {versionsData?.updatedAt && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Última atualização: {formatDateTime(versionsData.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Download */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instalador */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Instalador
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">Recomendado</p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Início automático com Windows
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Instalação com atalho no desktop
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Fácil desinstalação pelo Painel de Controle
            </li>
          </ul>

          <button
            onClick={() => handleDownload('installer')}
            disabled={!versionsData?.installerAvailable && versionsData?.available === false}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            <Download size={20} />
            Baixar Instalador
          </button>
        </div>

        {/* Portátil */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Monitor className="text-gray-600 dark:text-gray-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Versão Portátil
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">Sem instalação</p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Execute direto sem instalar
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Ideal para testes rápidos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Pode rodar de pendrive
            </li>
          </ul>

          <button
            onClick={() => handleDownload('portable')}
            disabled={!versionsData?.portableAvailable && versionsData?.available === false}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
          >
            <Download size={20} />
            Baixar Portátil
          </button>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Instruções de Instalação
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-2">
              <li>Baixe o instalador ou versão portátil no computador do cliente</li>
              <li>Execute o arquivo como <strong>administrador</strong></li>
              <li>Na tela de configuração, conecte ao servidor e selecione o cliente</li>
              <li>Preencha os dados do recurso (nome, localização, departamento)</li>
              <li>O agente iniciará automaticamente e aparecerá na bandeja do sistema</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Requisitos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Requisitos do Sistema
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Sistema Operacional</p>
            <p className="text-gray-900 dark:text-white">Windows 10 / 11 (64-bit)</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Memória RAM</p>
            <p className="text-gray-900 dark:text-white">Mínimo 4 GB</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Espaço em Disco</p>
            <p className="text-gray-900 dark:text-white">~100 MB</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Conexão</p>
            <p className="text-gray-900 dark:text-white">Acesso à rede/internet</p>
          </div>
        </div>
      </div>
    </div>
  );
}

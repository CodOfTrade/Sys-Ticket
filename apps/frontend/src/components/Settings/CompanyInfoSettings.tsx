import { useState, useEffect } from 'react';
import { Building, Save, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

interface CompanyInfo {
  company_trade_name?: string;
  company_cnpj?: string;
  company_legal_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
}

export function CompanyInfoSettings() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>({
    company_trade_name: '',
    company_cnpj: '',
    company_legal_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/service-desks/${currentUser.service_desk_id}/company-info`);

      if (response.data?.data) {
        setFormData(response.data.data);
      }
    } catch (error: any) {
      console.error('Erro ao buscar informações da empresa:', error);
      // Não mostrar erro se for 404 (dados ainda não cadastrados)
      if (error.response?.status !== 404) {
        toast.error('Erro ao carregar informações da empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateCNPJ = (cnpj: string): boolean => {
    const pattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    return pattern.test(cnpj);
  };

  const formatCNPJ = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    // Aplica a máscara
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData((prev) => ({ ...prev, company_cnpj: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.service_desk_id) {
      toast.error('Mesa de serviço não identificada');
      return;
    }

    // Validação de CNPJ se preenchido
    if (formData.company_cnpj && !validateCNPJ(formData.company_cnpj)) {
      toast.error('CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX');
      return;
    }

    try {
      setSaving(true);
      await api.patch(`/service-desks/${currentUser.service_desk_id}/company-info`, formData);
      toast.success('Informações da empresa atualizadas com sucesso');
      fetchCompanyInfo();
    } catch (error: any) {
      console.error('Erro ao atualizar informações:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar informações da empresa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Informações da Empresa
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure os dados da sua empresa para uso em relatórios e documentos
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome Fantasia e CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.company_trade_name || ''}
                onChange={(e) => setFormData({ ...formData, company_trade_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Nome comercial da empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={formData.company_cnpj || ''}
                onChange={(e) => handleCNPJChange(e.target.value)}
                maxLength={18}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          {/* Razão Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Razão Social
            </label>
            <input
              type="text"
              value={formData.company_legal_name || ''}
              onChange={(e) => setFormData({ ...formData, company_legal_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Razão social completa"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endereço
            </label>
            <textarea
              value={formData.company_address || ''}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Endereço completo da empresa"
            />
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.company_phone || ''}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.company_email || ''}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="url"
              value={formData.company_website || ''}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://www.empresa.com"
            />
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Informações importantes</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Estes dados serão utilizados em relatórios e documentos oficiais</li>
                  <li>O CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX</li>
                  <li>Todos os campos são opcionais, mas recomendamos preencher os dados completos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

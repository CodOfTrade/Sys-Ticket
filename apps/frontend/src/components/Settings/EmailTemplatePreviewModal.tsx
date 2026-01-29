import { useState } from 'react';
import { X, Code, Eye, AlertCircle } from 'lucide-react';
import { EmailTemplate } from '@/services/email-template.service';

interface EmailTemplatePreviewModalProps {
  template: EmailTemplate;
  onClose: () => void;
}

export function EmailTemplatePreviewModal({ template, onClose }: EmailTemplatePreviewModalProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'code'>('rendered');

  // Dados mockados para preview
  const mockData: Record<string, string> = {
    userName: 'João Silva',
    title: 'Alerta de Licença',
    message: 'Sua licença está próxima do vencimento',
    licenseKey: 'XXXX-XXXX-XXXX-XXXX',
    productName: 'Sistema de Gestão Pro',
    clientName: 'Empresa Exemplo LTDA',
    expiryDate: '31/12/2024',
    systemLink: 'https://172.31.255.26',
    contactPhone: '(11) 98765-4321',
    contactEmail: 'contato@empresa.com',
  };

  // Renderizar template com dados mockados
  const renderTemplate = (content: string): string => {
    let rendered = content;
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    });
    return rendered;
  };

  const renderedHtml = renderTemplate(template.html_body);
  const renderedSubject = renderTemplate(template.subject);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Preview do Template
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {template.alert_type} - {template.target_audience === 'admin' ? 'Administradores' : 'Clientes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info sobre dados mockados */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Este é um preview com dados mockados para demonstração. Os valores reais serão inseridos ao enviar o email.
              </p>
            </div>
          </div>

          {/* Toggle Renderizado/Código */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('rendered')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'rendered'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Eye size={16} />
              Renderizado
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'code'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Code size={16} />
              Código HTML
            </button>
          </div>

          {/* Assunto */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Assunto:
            </p>
            <p className="text-sm text-gray-900 dark:text-white font-medium">
              {renderedSubject}
            </p>
          </div>

          {/* Preview Renderizado */}
          {viewMode === 'rendered' && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <iframe
                srcDoc={renderedHtml}
                title="Email Preview"
                className="w-full h-[600px] bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          )}

          {/* Preview Código */}
          {viewMode === 'code' && (
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[600px] overflow-y-auto">
                <code>{renderedHtml}</code>
              </pre>
            </div>
          )}

          {/* Corpo em Texto */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Versão em Texto Plano (Fallback):
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {renderTemplate(template.text_body)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

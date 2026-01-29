import { useState } from 'react';
import { X, Save, AlertCircle, Copy, Check } from 'lucide-react';
import { EmailTemplate } from '@/services/email-template.service';
import toast from 'react-hot-toast';

interface EmailTemplateEditorModalProps {
  template: EmailTemplate;
  onSave: (id: string, data: { subject: string; html_body: string; text_body: string }) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function EmailTemplateEditorModal({
  template,
  onSave,
  onClose,
  isSaving,
}: EmailTemplateEditorModalProps) {
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.html_body);
  const [textBody, setTextBody] = useState(template.text_body);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('O assunto é obrigatório');
      return;
    }

    if (!htmlBody.trim()) {
      toast.error('O corpo HTML é obrigatório');
      return;
    }

    if (!textBody.trim()) {
      toast.error('O corpo em texto é obrigatório');
      return;
    }

    onSave(template.id, {
      subject: subject.trim(),
      html_body: htmlBody.trim(),
      text_body: textBody.trim(),
    });
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{${variable}}`);
    setCopiedVar(variable);
    toast.success(`Variável {${variable}} copiada!`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Editar Template de Email
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

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            {/* Info sobre variáveis */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Variáveis Disponíveis (clique para copiar):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.available_variables.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => copyVariable(variable)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-mono rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        <span>{`{${variable}}`}</span>
                        {copiedVar === variable ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Assunto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assunto do Email *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: {title} - {clientName}"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Toggle HTML/Texto */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setViewMode('html')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'html'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Corpo HTML
              </button>
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'text'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Corpo Texto (Fallback)
              </button>
            </div>

            {/* Corpo HTML */}
            {viewMode === 'html' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corpo HTML *
                </label>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Cole aqui o HTML do email..."
                  rows={16}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Use as variáveis no formato {'{variableName}'} dentro do HTML
                </p>
              </div>
            )}

            {/* Corpo Texto */}
            {viewMode === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corpo em Texto Plano (Fallback) *
                </label>
                <textarea
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Versão em texto plano para clientes de email que não suportam HTML..."
                  rows={16}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Use as variáveis no formato {'{variableName}'} dentro do texto
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

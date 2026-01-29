import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateService, EmailTemplate } from '@/services/email-template.service';
import { Mail, Edit, Eye, RotateCcw, Loader2, AlertCircle, Users, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmailTemplateEditorModal } from './EmailTemplateEditorModal';
import { EmailTemplatePreviewModal } from './EmailTemplatePreviewModal';

const ALERT_TYPE_LABELS: Record<string, string> = {
  license_expiring_30: 'Licença Expirando em 30 Dias',
  license_expiring_15: 'Licença Expirando em 15 Dias',
  license_expiring_7: 'Licença Expirando em 7 Dias',
  license_expired: 'Licença Expirada',
};

const ALERT_TYPE_ICONS: Record<string, string> = {
  license_expiring_30: '🟢',
  license_expiring_15: '🟡',
  license_expiring_7: '🟠',
  license_expired: '🔴',
};

const TARGET_AUDIENCE_LABELS = {
  admin: 'Administradores',
  client: 'Clientes',
};

export function EmailTemplatesSettings() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const queryClient = useQueryClient();

  // Query para buscar todos os templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.getAll(),
  });

  // Mutation para atualizar template
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { subject: string; html_body: string; text_body: string } }) =>
      emailTemplateService.update(id, data),
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditingTemplate(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar template');
    },
  });

  // Mutation para resetar template
  const resetMutation = useMutation({
    mutationFn: (id: string) => emailTemplateService.resetToDefault(id),
    onSuccess: () => {
      toast.success('Template resetado para o padrão!');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: () => {
      toast.error('Erro ao resetar template');
    },
  });

  // Agrupar templates por alert_type
  const groupedTemplates: Record<string, EmailTemplate[]> = {};
  templates?.forEach((template) => {
    if (!groupedTemplates[template.alert_type]) {
      groupedTemplates[template.alert_type] = [];
    }
    groupedTemplates[template.alert_type].push(template);
  });

  const handleReset = (template: EmailTemplate) => {
    if (confirm('Deseja realmente resetar este template para o padrão do sistema?')) {
      resetMutation.mutate(template.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Templates de Email
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Personalize os emails enviados para administradores e clientes nas notificações de licenças
        </p>
      </div>

      {/* Info sobre variáveis */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Variáveis Disponíveis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-2">
                  <Users size={14} /> Administradores:
                </p>
                <p className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                  {'{userName}, {title}, {message}, {licenseKey}, {productName}, {clientName}, {expiryDate}, {systemLink}'}
                </p>
              </div>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-2">
                  <Building2 size={14} /> Clientes:
                </p>
                <p className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                  {'{clientName}, {title}, {message}, {productName}, {expiryDate}, {contactPhone}, {contactEmail}'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates agrupados por tipo */}
      <div className="space-y-6">
        {Object.entries(groupedTemplates).map(([alertType, templates]) => (
          <div key={alertType} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ALERT_TYPE_ICONS[alertType]}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {ALERT_TYPE_LABELS[alertType]}
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {/* Header do card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {template.target_audience === 'admin' ? (
                        <Users size={18} className="text-blue-500" />
                      ) : (
                        <Building2 size={18} className="text-purple-500" />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {TARGET_AUDIENCE_LABELS[template.target_audience]}
                      </h4>
                    </div>
                    {template.is_default && (
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        Padrão
                      </span>
                    )}
                  </div>

                  {/* Assunto do email */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assunto:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {template.subject}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleReset(template)}
                      disabled={resetMutation.isPending}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                      title="Resetar para padrão"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modais */}
      {editingTemplate && (
        <EmailTemplateEditorModal
          template={editingTemplate}
          onSave={(id, data) => updateMutation.mutate({ id, data })}
          onClose={() => setEditingTemplate(null)}
          isSaving={updateMutation.isPending}
        />
      )}

      {previewTemplate && (
        <EmailTemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

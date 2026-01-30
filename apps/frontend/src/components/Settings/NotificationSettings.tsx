import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileKey, Ticket, Server, FileText, Volume2 } from 'lucide-react';
import { notificationService, NotificationConfig } from '@/services/notification.service';
import { emailTemplateService, EmailTemplate } from '@/services/email-template.service';
import { AlertConfigCard } from './AlertConfigCard';
import { EmailTemplateEditorModal } from './EmailTemplateEditorModal';
import { EmailTemplatePreviewModal } from './EmailTemplatePreviewModal';
import { SoundSettings } from './SoundSettings';
import toast from 'react-hot-toast';

type NotificationCategory = 'sounds' | 'license' | 'ticket' | 'resource' | 'contract';

interface CategoryTab {
  id: NotificationCategory;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
}

export function NotificationSettings() {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('sounds');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const queryClient = useQueryClient();

  const { data: configsData, isLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: async () => {
      try {
        const result = await notificationService.getConfigs();
        return result;
      } catch (error) {
        console.error('Erro ao buscar configs:', error);
        return [];
      }
    },
  });

  const configs = Array.isArray(configsData) ? configsData : [];

  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationConfig> }) =>
      notificationService.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-configs'] });
      toast.success('Configuração atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar configuração');
    },
  });

  const updateTemplateMutation = useMutation({
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

  const handleToggle = (config: NotificationConfig, field: keyof NotificationConfig, value: boolean) => {
    updateMutation.mutate({
      id: config.id,
      data: { [field]: value },
    });
  };

  const findTemplate = (alertType: string, audience: 'admin' | 'client'): EmailTemplate | undefined => {
    return templates?.find(t => t.alert_type === alertType && t.target_audience === audience);
  };

  // Categorias de notificações (escalável)
  const categoryTabs: CategoryTab[] = [
    {
      id: 'sounds',
      label: 'Sons e SLA',
      icon: Volume2,
      enabled: true,
    },
    {
      id: 'license',
      label: 'Licencas',
      icon: FileKey,
      enabled: true,
    },
    {
      id: 'ticket',
      label: 'Tickets',
      icon: Ticket,
      enabled: false, // Futuro
    },
    {
      id: 'resource',
      label: 'Recursos',
      icon: Server,
      enabled: true,
    },
    {
      id: 'contract',
      label: 'Contratos',
      icon: FileText,
      enabled: false, // Futuro
    },
  ];

  // Filtrar configs por categoria
  const getConfigsByCategory = (category: NotificationCategory) => {
    return configs.filter((c) => c.category === category || c.alert_type.includes(category));
  };

  const licenseConfigs = getConfigsByCategory('license');
  const resourceConfigs = getConfigsByCategory('resource');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Configurações de Alertas
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure quais alertas devem ser enviados e para quem. Você pode configurar notificações
          no sistema e por email tanto para administradores quanto para clientes.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-2 -mb-px overflow-x-auto">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            const categoryConfigs = getConfigsByCategory(tab.id);
            // A aba "sounds" sempre está habilitada pois não depende de configs do servidor
            const hasConfigs = tab.id === 'sounds' || categoryConfigs.length > 0;

            return (
              <button
                key={tab.id}
                onClick={() => tab.enabled && hasConfigs && setActiveCategory(tab.id)}
                disabled={!tab.enabled || !hasConfigs}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap
                  transition-colors
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : !tab.enabled || !hasConfigs
                      ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300'
                  }
                `}
              >
                <Icon size={18} />
                {tab.label}
                {!tab.enabled && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                    Em breve
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content por categoria */}
      <div className="space-y-4">
        {activeCategory === 'sounds' && (
          <SoundSettings />
        )}

        {activeCategory === 'license' && (
          <>
            {licenseConfigs.length > 0 ? (
              licenseConfigs.map((config) => {
                const adminTemplate = findTemplate(config.alert_type, 'admin');
                const clientTemplate = findTemplate(config.alert_type, 'client');

                return (
                  <AlertConfigCard
                    key={config.id}
                    config={config}
                    onToggle={handleToggle}
                    isUpdating={updateMutation.isPending}
                    adminTemplate={adminTemplate}
                    clientTemplate={clientTemplate}
                    onEditAdminTemplate={() => adminTemplate && setEditingTemplate(adminTemplate)}
                    onPreviewAdminTemplate={() => adminTemplate && setPreviewTemplate(adminTemplate)}
                    onEditClientTemplate={() => clientTemplate && setEditingTemplate(clientTemplate)}
                    onPreviewClientTemplate={() => clientTemplate && setPreviewTemplate(clientTemplate)}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma configuração de licenças encontrada
              </div>
            )}
          </>
        )}

        {activeCategory === 'resource' && (
          <>
            {resourceConfigs.length > 0 ? (
              resourceConfigs.map((config) => {
                const adminTemplate = findTemplate(config.alert_type, 'admin');
                const clientTemplate = findTemplate(config.alert_type, 'client');

                return (
                  <AlertConfigCard
                    key={config.id}
                    config={config}
                    onToggle={handleToggle}
                    isUpdating={updateMutation.isPending}
                    adminTemplate={adminTemplate}
                    clientTemplate={clientTemplate}
                    onEditAdminTemplate={() => adminTemplate && setEditingTemplate(adminTemplate)}
                    onPreviewAdminTemplate={() => adminTemplate && setPreviewTemplate(adminTemplate)}
                    onEditClientTemplate={() => clientTemplate && setEditingTemplate(clientTemplate)}
                    onPreviewClientTemplate={() => clientTemplate && setPreviewTemplate(clientTemplate)}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma configuração de recursos encontrada
              </div>
            )}
          </>
        )}

        {activeCategory === 'ticket' && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Ticket size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Alertas de Tickets</p>
            <p className="text-sm">
              Configuração de alertas para tickets em desenvolvimento.
            </p>
          </div>
        )}

        {activeCategory === 'contract' && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Alertas de Contratos</p>
            <p className="text-sm">
              Configuração de alertas para contratos em desenvolvimento.
            </p>
          </div>
        )}
      </div>

      {/* Legenda - apenas para licenças */}
      {activeCategory === 'license' && licenseConfigs.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Legenda de Alertas de Licenças
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <span className="text-gray-600 dark:text-gray-400">30 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span className="text-gray-600 dark:text-gray-400">15 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟠</span>
              <span className="text-gray-600 dark:text-gray-400">7 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span className="text-gray-600 dark:text-gray-400">Expirada</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box - apenas para outras categorias que não são sounds */}
      {activeCategory !== 'sounds' && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Dica:</strong> Emails para clientes incluem automaticamente informacoes para
            renovacao de licencas. Configure o email de contato no cadastro de cada licenca.
          </p>
        </div>
      )}

      {/* Modais de Template */}
      {editingTemplate && (
        <EmailTemplateEditorModal
          template={editingTemplate}
          onSave={(id, data) => updateTemplateMutation.mutate({ id, data })}
          onClose={() => setEditingTemplate(null)}
          isSaving={updateTemplateMutation.isPending}
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

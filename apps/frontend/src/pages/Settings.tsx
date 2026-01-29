import { useState } from 'react';
import { Settings as SettingsIcon, DollarSign, FolderTree, Users, Bell, Sliders, Palette, CheckSquare } from 'lucide-react';
import { PricingSettings } from '@/components/Settings/PricingSettings';
import { LogoSettings } from '@/components/Settings/LogoSettings';
import { ChecklistSettings } from '@/components/Settings/ChecklistSettings';
import { ServiceCatalogSettings } from '@/components/Settings/ServiceCatalogSettings';
import { NotificationSettings } from '@/components/Settings/NotificationSettings';

type SettingsTab = 'pricing' | 'branding' | 'checklists' | 'catalogs' | 'users' | 'notifications' | 'general';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pricing');

  const tabs = [
    { id: 'pricing' as SettingsTab, label: 'Precificacao', icon: DollarSign },
    { id: 'branding' as SettingsTab, label: 'Identidade Visual', icon: Palette },
    { id: 'checklists' as SettingsTab, label: 'Checklists', icon: CheckSquare },
    { id: 'catalogs' as SettingsTab, label: 'Catalogos de Servico', icon: FolderTree },
    { id: 'users' as SettingsTab, label: 'Usuarios e Permissoes', icon: Users },
    { id: 'notifications' as SettingsTab, label: 'Notificacoes', icon: Bell },
    { id: 'general' as SettingsTab, label: 'Geral', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie as configurações do sistema, precificação, usuários e mais.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pricing' && <PricingSettings />}
            {activeTab === 'branding' && <LogoSettings />}
            {activeTab === 'checklists' && <ChecklistSettings />}
            {activeTab === 'catalogs' && <ServiceCatalogSettings />}
            {activeTab === 'users' && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Usuarios e Permissoes - Em desenvolvimento
              </div>
            )}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'general' && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Configuracoes Gerais - Em desenvolvimento
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

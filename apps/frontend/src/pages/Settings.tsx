import { useState } from 'react';
import { Settings as SettingsIcon, Ticket, Users, Bell, Sliders, Palette, Shield } from 'lucide-react';
import { TicketSettingsContainer } from '@/components/Settings/TicketSettingsContainer';
import { GeneralSettingsContainer } from '@/components/Settings/GeneralSettingsContainer';
import { LogoSettings } from '@/components/Settings/LogoSettings';
import { NotificationSettings } from '@/components/Settings/NotificationSettings';
import { UsersSettings } from '@/components/Settings/UsersSettings';
import { RolesSettings } from '@/components/Settings/RolesSettings';

type SettingsTab = 'tickets' | 'branding' | 'users-permissions' | 'notifications' | 'general';
type UsersPermissionsSubTab = 'users' | 'roles';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('tickets');
  const [usersPermissionsSubTab, setUsersPermissionsSubTab] = useState<UsersPermissionsSubTab>('users');

  const tabs = [
    { id: 'tickets' as SettingsTab, label: 'Tickets', icon: Ticket },
    { id: 'branding' as SettingsTab, label: 'Identidade Visual', icon: Palette },
    { id: 'users-permissions' as SettingsTab, label: 'Usuarios e Permissoes', icon: Users },
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
            {activeTab === 'tickets' && <TicketSettingsContainer />}
            {activeTab === 'branding' && <LogoSettings />}
            {activeTab === 'users-permissions' && (
              <div>
                {/* Sub-tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setUsersPermissionsSubTab('users')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                      ${usersPermissionsSubTab === 'users'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Usuarios
                    </div>
                  </button>
                  <button
                    onClick={() => setUsersPermissionsSubTab('roles')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                      ${usersPermissionsSubTab === 'roles'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Perfil de Permissao
                    </div>
                  </button>
                </div>

                {/* Sub-tab Content */}
                {usersPermissionsSubTab === 'users' && <UsersSettings />}
                {usersPermissionsSubTab === 'roles' && <RolesSettings />}
              </div>
            )}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'general' && <GeneralSettingsContainer />}
          </div>
        </div>
      </div>
    </div>
  );
}

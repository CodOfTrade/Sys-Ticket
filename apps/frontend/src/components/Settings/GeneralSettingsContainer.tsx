import { useState } from 'react';
import { Building } from 'lucide-react';
import { CompanyInfoSettings } from './CompanyInfoSettings';

type GeneralSettingsSubTab = 'company';

export function GeneralSettingsContainer() {
  const [activeSubTab, setActiveSubTab] = useState<GeneralSettingsSubTab>('company');

  const subTabs = [
    { id: 'company' as GeneralSettingsSubTab, label: 'Informações da Empresa', icon: Building },
    // Adicionar novas abas aqui no futuro
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px gap-2 overflow-x-auto">
          {subTabs.map((subTab) => {
            const Icon = subTab.icon;
            const isActive = activeSubTab === subTab.id;

            return (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {subTab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === 'company' && <CompanyInfoSettings />}
      </div>
    </div>
  );
}

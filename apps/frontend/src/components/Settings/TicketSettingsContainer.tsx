import { useState } from 'react';
import { DollarSign, FolderTree, CheckSquare, Clock, Layers } from 'lucide-react';
import { PricingSettings } from './PricingSettings';
import { ServiceCatalogSettings } from './ServiceCatalogSettings';
import { ChecklistSettings } from './ChecklistSettings';

type TicketSettingsSubTab = 'pricing' | 'queues' | 'catalogs' | 'sla' | 'checklists';

export function TicketSettingsContainer() {
  const [activeSubTab, setActiveSubTab] = useState<TicketSettingsSubTab>('pricing');

  const subTabs = [
    { id: 'pricing' as TicketSettingsSubTab, label: 'Precificação', icon: DollarSign },
    { id: 'queues' as TicketSettingsSubTab, label: 'Filas', icon: Layers },
    { id: 'catalogs' as TicketSettingsSubTab, label: 'Catálogos de Serviço', icon: FolderTree },
    { id: 'sla' as TicketSettingsSubTab, label: 'SLA', icon: Clock },
    { id: 'checklists' as TicketSettingsSubTab, label: 'Checklists', icon: CheckSquare },
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
        {activeSubTab === 'pricing' && <PricingSettings />}
        {activeSubTab === 'queues' && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-12 text-center border-2 border-dashed border-blue-300 dark:border-blue-600">
            <Layers className="w-16 h-16 mx-auto mb-4 text-blue-500 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Configuração de Filas
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
              Configure filas de atendimento, estratégias de distribuição e gerencie membros.
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Backend implementado ✓ | Interface em desenvolvimento...
            </p>
          </div>
        )}
        {activeSubTab === 'catalogs' && <ServiceCatalogSettings />}
        {activeSubTab === 'sla' && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-12 text-center border-2 border-dashed border-orange-300 dark:border-orange-600">
            <Clock className="w-16 h-16 mx-auto mb-4 text-orange-500 dark:text-orange-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Configuração de SLA
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
              Defina prazos de resposta e resolução por prioridade, configure horário comercial e dias úteis.
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
              Backend implementado ✓ | Interface em desenvolvimento...
            </p>
          </div>
        )}
        {activeSubTab === 'checklists' && <ChecklistSettings />}
      </div>
    </div>
  );
}

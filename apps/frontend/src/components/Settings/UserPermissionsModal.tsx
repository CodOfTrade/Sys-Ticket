import { useState, useEffect } from 'react';
import { X, Check, Shield, Info } from 'lucide-react';
import { permissionService } from '@/services/permission.service';
import type {
  User,
  Permission,
  PermissionsMap,
  PermissionsByModule,
} from '@/types/permissions.types';

interface UserPermissionsModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  tickets: 'Tickets',
  users: 'Usuarios',
  roles: 'Perfis',
  queues: 'Filas',
  clients: 'Clientes',
  resources: 'Recursos',
  licenses: 'Licencas',
  settings: 'Configuracoes',
  reports: 'Relatorios',
  'service-desks': 'Mesas de Servico',
  sla: 'SLA',
  timesheets: 'Apontamentos',
  notifications: 'Notificacoes',
  audit: 'Auditoria',
  'service-catalog': 'Catalogo de Servicos',
  downloads: 'Downloads',
};

export function UserPermissionsModal({ user, onClose, onSuccess }: UserPermissionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<PermissionsMap>({});
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({});
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [extraPermissions, setExtraPermissions] = useState<Permission[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  useEffect(() => {
    loadPermissions();
  }, [user]);

  const loadPermissions = async () => {
    try {
      // Carrega todas as permissoes disponiveis
      const allPermsResponse = await permissionService.getAllPermissions();
      setAllPermissions(allPermsResponse.permissions);
      setPermissionsByModule(allPermsResponse.byModule);

      // Carrega permissoes padrao do role
      const defaultPerms = await permissionService.getDefaultRolePermissions();
      const userRolePerms = defaultPerms[user.role] || [];

      // Se tem custom_role, usa as permissoes do custom_role
      if (user.custom_role_id && user.custom_role) {
        setRolePermissions(user.custom_role.permissions);
      } else {
        setRolePermissions(userRolePerms);
      }

      // Carrega permissoes extras do usuario
      setExtraPermissions(user.permissions || []);
    } catch (error) {
      console.error('Erro ao carregar permissoes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    );
  };

  const isPermissionFromRole = (permission: Permission) => {
    return rolePermissions.includes(permission) || rolePermissions.includes('*');
  };

  const isPermissionExtra = (permission: Permission) => {
    return extraPermissions.includes(permission);
  };

  const toggleExtraPermission = (permission: Permission) => {
    if (isPermissionFromRole(permission)) {
      // Nao pode desmarcar permissoes do role
      return;
    }

    setExtraPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await permissionService.updateUserPermissions(user.id, extraPermissions);
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar permissoes:', error);
      alert('Erro ao salvar permissoes');
    } finally {
      setSaving(false);
    }
  };

  const getModulePermissionCount = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const activeCount = modulePerms.filter(
      (p) => isPermissionFromRole(p) || isPermissionExtra(p),
    ).length;
    return `${activeCount}/${modulePerms.length}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-gray-500 dark:text-gray-400">Carregando permissoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Permissoes de {user.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Perfil: {user.custom_role?.name || user.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Info */}
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>
                Permissoes com <Shield className="inline w-4 h-4 text-green-500" /> sao
                herdadas do perfil e nao podem ser removidas.
              </p>
              <p>Marque permissoes adicionais conforme necessario.</p>
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {Object.entries(permissionsByModule).map(([module, permissions]) => (
              <div
                key={module}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {MODULE_LABELS[module] || module}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getModulePermissionCount(module)}
                  </span>
                </button>

                {/* Module Permissions */}
                {expandedModules.includes(module) && (
                  <div className="p-4 space-y-2 bg-white dark:bg-gray-800">
                    {permissions.map((permission) => {
                      const fromRole = isPermissionFromRole(permission);
                      const isExtra = isPermissionExtra(permission);
                      const isActive = fromRole || isExtra;

                      return (
                        <label
                          key={permission}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
                                     ${fromRole ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                                     ${!fromRole ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => !fromRole && toggleExtraPermission(permission)}
                        >
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center
                                       ${isActive ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            {isActive && <Check className="w-3 h-3 text-white" />}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {allPermissions[permission] || permission}
                              </span>
                              {fromRole && (
                                <span title="Herdado do perfil">
                                  <Shield className="w-4 h-4 text-green-500" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {permission}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Permissoes'}
          </button>
        </div>
      </div>
    </div>
  );
}

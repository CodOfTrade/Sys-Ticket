import { useState, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { permissionService } from '@/services/permission.service';
import type {
  CustomRole,
  Permission,
  PermissionsMap,
  PermissionsByModule,
} from '@/types/permissions.types';

interface RoleFormModalProps {
  role: CustomRole | null;
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

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6B7280', // gray
];

export function RoleFormModal({ role, onClose, onSuccess }: RoleFormModalProps) {
  const isEditing = !!role;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<PermissionsMap>({});
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({});
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0],
    permissions: [] as Permission[],
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        color: role.color,
        permissions: role.permissions,
        is_active: role.is_active,
      });
    }
  }, [role]);

  const loadPermissions = async () => {
    try {
      const response = await permissionService.getAllPermissions();
      setAllPermissions(response.permissions);
      setPermissionsByModule(response.byModule);
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

  const togglePermission = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const allSelected = modulePerms.every((p) => formData.permissions.includes(p));

    if (allSelected) {
      // Remove todas do modulo
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !modulePerms.includes(p)),
      }));
    } else {
      // Adiciona todas do modulo
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...modulePerms])],
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome e obrigatorio';
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'Selecione pelo menos uma permissao';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isEditing) {
        await permissionService.updateCustomRole(role.id, formData);
      } else {
        await permissionService.createCustomRole(formData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Erro ao salvar perfil' });
      }
    } finally {
      setSaving(false);
    }
  };

  const getModuleStatus = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const selectedCount = modulePerms.filter((p) => formData.permissions.includes(p)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === modulePerms.length) return 'all';
    return 'partial';
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Perfil' : 'Novo Perfil'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700
                         text-gray-900 dark:text-white
                         ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Ex: Supervisor N2"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Descricao */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descricao
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descricao do perfil"
            />
          </div>

          {/* Cor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cor
            </label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full transition-transform
                             ${formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                Perfil ativo
              </label>
            </div>
          )}

          {/* Permissoes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissoes *
            </label>
            {errors.permissions && (
              <p className="mb-2 text-sm text-red-500">{errors.permissions}</p>
            )}

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {Object.entries(permissionsByModule).map(([module, permissions]) => {
                const status = getModuleStatus(module);
                const isExpanded = expandedModules.includes(module);

                return (
                  <div key={module} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    {/* Module Header */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
                      <button
                        type="button"
                        onClick={() => toggleModule(module)}
                        className="p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(module)}
                        className={`w-5 h-5 rounded border flex items-center justify-center
                                   ${status === 'all' ? 'bg-blue-600 border-blue-600' : ''}
                                   ${status === 'partial' ? 'bg-blue-600/50 border-blue-600' : ''}
                                   ${status === 'none' ? 'border-gray-300 dark:border-gray-600' : ''}`}
                      >
                        {(status === 'all' || status === 'partial') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>

                      <span
                        className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => toggleModule(module)}
                      >
                        {MODULE_LABELS[module] || module}
                      </span>

                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                        {permissions.filter((p) => formData.permissions.includes(p)).length}/
                        {permissions.length}
                      </span>
                    </div>

                    {/* Module Permissions */}
                    {isExpanded && (
                      <div className="px-4 py-2 space-y-1 bg-white dark:bg-gray-800">
                        {permissions.map((permission) => (
                          <label
                            key={permission}
                            className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {allPermissions[permission] || permission}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {formData.permissions.length} permissao(es) selecionada(s)
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}

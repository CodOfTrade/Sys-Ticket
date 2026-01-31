import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Shield, MoreVertical, RefreshCw } from 'lucide-react';
import { permissionService } from '@/services/permission.service';
import { PermissionGate } from '@/components/PermissionGate';
import { RoleFormModal } from './RoleFormModal';
import type { CustomRole } from '@/types/permissions.types';

export function RolesSettings() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionService.getAllCustomRoles(true);
      setRoles(data);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreate = () => {
    setSelectedRole(null);
    setShowFormModal(true);
  };

  const handleEdit = (role: CustomRole) => {
    setSelectedRole(role);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (role: CustomRole) => {
    if (!confirm(`Deseja realmente excluir o perfil "${role.name}"?`)) {
      return;
    }
    try {
      await permissionService.deleteCustomRole(role.id);
      loadRoles();
    } catch (error: any) {
      console.error('Erro ao excluir perfil:', error);
      alert(error.response?.data?.message || 'Erro ao excluir perfil');
    }
    setOpenMenuId(null);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setSelectedRole(null);
    loadRoles();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Perfis Customizados
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crie perfis com permissoes especificas para seus usuarios
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRoles}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <PermissionGate permissions={['roles:create']}>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Perfil
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Lista de Roles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            Carregando...
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum perfil customizado criado</p>
            <p className="text-sm mt-1">
              Clique em "Novo Perfil" para criar um
            </p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4
                         ${!role.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: role.color + '20' }}
                  >
                    <Shield className="w-5 h-5" style={{ color: role.color }} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </h4>
                    {!role.is_active && (
                      <span className="text-xs text-red-500">Inativo</span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === role.id ? null : role.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {openMenuId === role.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <PermissionGate permissions={['roles:update']}>
                        <button
                          onClick={() => handleEdit(role)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                      </PermissionGate>
                      <PermissionGate permissions={['roles:delete']}>
                        <button
                          onClick={() => handleDelete(role)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </PermissionGate>
                    </div>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {role.description}
                </p>
              )}

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{role.permissions.length} permissoes</span>
                {role.created_by && (
                  <span>Criado por {role.created_by.name}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showFormModal && (
        <RoleFormModal
          role={selectedRole}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

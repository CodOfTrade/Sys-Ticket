import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  MoreVertical,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { userService } from '@/services/user.service';
import { PermissionGate } from '@/components/PermissionGate';
import { UserFormModal } from './UserFormModal';
import { UserPermissionsModal } from './UserPermissionsModal';
import type { User, UserRole, UserStatus } from '@/types/permissions.types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Agente',
  client: 'Cliente',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  agent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  client: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  suspended: 'Suspenso',
};

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const perPage = 10;

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userService.getAll({
        page,
        perPage,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = () => {
    setSelectedUser(null);
    setShowFormModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handlePermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Deseja realmente excluir o usuario "${user.name}"?`)) {
      return;
    }
    try {
      await userService.delete(user.id);
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuario:', error);
      alert('Erro ao excluir usuario');
    }
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.updateStatus(user.id, newStatus);
      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do usuario');
    }
    setOpenMenuId(null);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setSelectedUser(null);
    loadUsers();
  };

  const handlePermissionsSuccess = () => {
    setShowPermissionsModal(false);
    setSelectedUser(null);
    loadUsers();
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro de Role */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="manager">Gerente</option>
            <option value="agent">Agente</option>
            <option value="client">Cliente</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as UserStatus | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>

        {/* Botoes */}
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <PermissionGate permissions={['users:create']}>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Usuario
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Nenhum usuario encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}
                      >
                        {user.custom_role?.name || ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.status || 'active']}`}
                      >
                        {STATUS_LABELS[user.status || 'active']}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === user.id ? null : user.id)
                          }
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {openMenuId === user.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                            <PermissionGate permissions={['users:update']}>
                              <button
                                onClick={() => handleEdit(user)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit2 className="w-4 h-4" />
                                Editar
                              </button>
                            </PermissionGate>

                            <PermissionGate permissions={['users:manage-permissions']}>
                              <button
                                onClick={() => handlePermissions(user)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Shield className="w-4 h-4" />
                                Permissoes
                              </button>
                            </PermissionGate>

                            <PermissionGate permissions={['users:update']}>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <UserX className="w-4 h-4" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    Ativar
                                  </>
                                )}
                              </button>
                            </PermissionGate>

                            <PermissionGate permissions={['users:delete']}>
                              <button
                                onClick={() => handleDelete(user)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </PermissionGate>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {(page - 1) * perPage + 1} a {Math.min(page * perPage, total)} de{' '}
              {total} usuarios
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Proximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showFormModal && (
        <UserFormModal
          user={selectedUser}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showPermissionsModal && selectedUser && (
        <UserPermissionsModal
          user={selectedUser}
          onClose={() => setShowPermissionsModal(false)}
          onSuccess={handlePermissionsSuccess}
        />
      )}
    </div>
  );
}

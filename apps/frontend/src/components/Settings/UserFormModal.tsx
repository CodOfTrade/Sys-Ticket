import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { userService } from '@/services/user.service';
import { permissionService } from '@/services/permission.service';
import type { User, UserRole, UserStatus, CustomRole } from '@/types/permissions.types';

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'agent', label: 'Agente' },
  { value: 'client', label: 'Cliente' },
];

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'suspended', label: 'Suspenso' },
];

export function UserFormModal({ user, onClose, onSuccess }: UserFormModalProps) {
  const isEditing = !!user;
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [useCustomRole, setUseCustomRole] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent' as UserRole,
    status: 'active' as UserStatus,
    phone: '',
    department: '',
    custom_role_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Carrega roles customizados
    setLoadingRoles(true);
    permissionService.getAllCustomRoles()
      .then((roles) => {
        console.log('Custom roles carregados:', roles);
        setCustomRoles(roles);
      })
      .catch((error) => {
        console.error('Erro ao carregar perfis customizados:', error);
      })
      .finally(() => setLoadingRoles(false));

    // Preenche formulario se editando
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status || 'active',
        phone: user.phone || '',
        department: user.department || '',
        custom_role_id: user.custom_role_id || '',
      });
      setUseCustomRole(!!user.custom_role_id);
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome e obrigatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email e obrigatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalido';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'Senha e obrigatoria para novos usuarios';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (useCustomRole && !formData.custom_role_id) {
      newErrors.custom_role_id = 'Selecione um perfil customizado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        custom_role_id: useCustomRole ? formData.custom_role_id : null,
      };

      if (formData.password) {
        data.password = formData.password;
      }

      if (isEditing) {
        await userService.update(user.id, data);
      } else {
        await userService.create(data);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar usuario:', error);
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Erro ao salvar usuario' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Usuario' : 'Novo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              placeholder="Nome completo"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700
                         text-gray-900 dark:text-white
                         ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha {!isEditing && '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700
                           text-gray-900 dark:text-white pr-10
                           ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder={isEditing ? 'Deixe em branco para manter' : 'Minimo 6 caracteres'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Tipo de Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Perfil
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomRole}
                  onChange={() => setUseCustomRole(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Perfil Fixo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomRole}
                  onChange={() => setUseCustomRole(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Perfil Customizado</span>
              </label>
            </div>
          </div>

          {/* Role Fixo ou Customizado */}
          {!useCustomRole ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Perfil *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Perfil Customizado * {loadingRoles && <span className="text-gray-400">(carregando...)</span>}
              </label>
              <select
                value={formData.custom_role_id}
                onChange={(e) => setFormData({ ...formData, custom_role_id: e.target.value })}
                disabled={loadingRoles}
                className={`w-full px-3 py-2 border rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           ${errors.custom_role_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:opacity-50`}
              >
                <option value="">
                  {loadingRoles ? 'Carregando perfis...' : `Selecione um perfil (${customRoles.length} disponiveis)`}
                </option>
                {customRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.permissions?.length || 0} permissoes)
                  </option>
                ))}
              </select>
              {errors.custom_role_id && (
                <p className="mt-1 text-sm text-red-500">{errors.custom_role_id}</p>
              )}
              {!loadingRoles && customRoles.length === 0 && (
                <p className="mt-1 text-sm text-amber-500">
                  Nenhum perfil customizado encontrado. Crie um em "Perfis e Permissoes".
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: TI, Comercial, Suporte"
            />
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

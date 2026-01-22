import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Clock,
  Settings,
  FileText,
  DollarSign,
  Building2,
  ClipboardCheck,
  HardDrive,
} from 'lucide-react';
import { settingsService } from '@/services/settings.service';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
  },
  {
    title: 'Tickets',
    icon: <Ticket size={20} />,
    path: '/tickets',
  },
  {
    title: 'Aprovação',
    icon: <ClipboardCheck size={20} />,
    path: '/ticket-approval',
  },
  {
    title: 'Clientes',
    icon: <Users size={20} />,
    path: '/clients',
  },
  {
    title: 'Recursos',
    icon: <HardDrive size={20} />,
    path: '/resources',
  },
  {
    title: 'Apontamentos',
    icon: <Clock size={20} />,
    path: '/timesheets',
  },
  {
    title: 'Mesas de Serviço',
    icon: <Building2 size={20} />,
    path: '/service-desks',
  },
  {
    title: 'Precificação',
    icon: <DollarSign size={20} />,
    path: '/pricing',
  },
  {
    title: 'Relatórios',
    icon: <FileText size={20} />,
    path: '/reports',
  },
  {
    title: 'Configurações',
    icon: <Settings size={20} />,
    path: '/settings',
  },
];

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  // Buscar logos
  const { data: logos } = useQuery({
    queryKey: ['settings', 'logos'],
    queryFn: () => settingsService.getLogos(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen transition-transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-64 border-r
        bg-white dark:bg-gray-900
        border-gray-200 dark:border-gray-700
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <Link to="/dashboard" className="flex items-center space-x-2">
          {logos?.logo_system ? (
            <img
              src={`${baseUrl}${logos.logo_system}`}
              alt="Logo"
              className="h-8 object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Ticket className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Sys-Ticket
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center space-x-3 px-4 py-3 rounded-lg
              transition-colors group relative
              ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <span
              className={`
                ${
                  isActive(item.path)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }
              `}
            >
              {item.icon}
            </span>
            <span className="font-medium">{item.title}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

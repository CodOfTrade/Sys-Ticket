import { Ticket, Users, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className={`flex items-center space-x-1 text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

interface RecentActivity {
  id: string;
  title: string;
  time: string;
  type: 'ticket' | 'client' | 'timesheet';
}

export default function Dashboard() {
  const stats = [
    {
      title: 'Tickets Abertos',
      value: 24,
      change: 12,
      icon: <Ticket size={24} className="text-blue-600" />,
      color: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Clientes Ativos',
      value: 156,
      change: 8,
      icon: <Users size={24} className="text-green-600" />,
      color: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Horas Este Mês',
      value: '124h',
      change: 15,
      icon: <Clock size={24} className="text-orange-600" />,
      color: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: 'Receita Este Mês',
      value: 'R$ 18.5k',
      change: 23,
      icon: <DollarSign size={24} className="text-purple-600" />,
      color: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  const recentActivities: RecentActivity[] = [
    { id: '1', title: 'Novo ticket #1234 criado por João Silva', time: '5 min atrás', type: 'ticket' },
    { id: '2', title: 'Cliente Maria Santos atualizou cadastro', time: '15 min atrás', type: 'client' },
    { id: '3', title: 'Apontamento de 2.5h registrado no ticket #1233', time: '30 min atrás', type: 'timesheet' },
    { id: '4', title: 'Ticket #1232 foi fechado', time: '1h atrás', type: 'ticket' },
    { id: '5', title: 'Novo cliente Pedro Oliveira cadastrado', time: '2h atrás', type: 'client' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visão geral do sistema de tickets
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tickets por Mês
            </h2>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Últimos 6 meses</option>
              <option>Último ano</option>
            </select>
          </div>

          {/* Simple chart placeholder */}
          <div className="h-64 flex items-end justify-between space-x-2">
            {[40, 65, 55, 80, 70, 90].map((height, index) => (
              <div key={index} className="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t-lg transition-all hover:bg-blue-600 dark:hover:bg-blue-500" style={{ height: `${height}%` }}>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>Mai</span>
            <span>Jun</span>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Atividades Recentes
          </h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'ticket' ? 'bg-blue-500' :
                  activity.type === 'client' ? 'bg-green-500' :
                  'bg-orange-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Ver todas as atividades
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-left transition-colors">
          <Ticket className="text-blue-600 mb-3" size={24} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Novo Ticket</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Criar um novo ticket de atendimento</p>
        </button>

        <button className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-left transition-colors">
          <Users className="text-green-600 mb-3" size={24} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Novo Cliente</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Cadastrar novo cliente no sistema</p>
        </button>

        <button className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-left transition-colors">
          <Clock className="text-orange-600 mb-3" size={24} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Apontamento</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Registrar horas trabalhadas</p>
        </button>
      </div>
    </div>
  );
}

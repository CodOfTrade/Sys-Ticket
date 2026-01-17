import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@components/Layout/Layout';
import { ProtectedRoute } from '@components/ProtectedRoute';
import Login from '@pages/Login';
import Dashboard from '@pages/Dashboard';
import Tickets from '@pages/Tickets';
import TicketDetails from '@pages/TicketDetails';
import TicketApproval from '@pages/TicketApproval';
import Clients from '@pages/Clients';
import { Settings } from '@pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rota pública - Login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketDetails />} />
            <Route path="ticket-approval" element={<TicketApproval />} />
            <Route path="clients" element={<Clients />} />
            <Route path="timesheets" element={
              <div className="text-gray-600 dark:text-gray-400">Página em desenvolvimento...</div>
            } />
            <Route path="service-desks" element={
              <div className="text-gray-600 dark:text-gray-400">Página em desenvolvimento...</div>
            } />
            <Route path="pricing" element={
              <div className="text-gray-600 dark:text-gray-400">Página em desenvolvimento...</div>
            } />
            <Route path="reports" element={
              <div className="text-gray-600 dark:text-gray-400">Página em desenvolvimento...</div>
            } />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={
              <div className="text-gray-600 dark:text-gray-400">Página em desenvolvimento...</div>
            } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

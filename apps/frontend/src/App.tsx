import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Páginas (a serem criadas)
// import Dashboard from '@pages/Dashboard';
// import Login from '@pages/Login';
// import Tickets from '@pages/Tickets';

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
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    🎫 Sys-Ticket
                  </h1>
                  <p className="text-lg text-gray-600 mb-8">
                    Sistema de Gestão de Tickets e Atendimento
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>✅ Backend API: NestJS + TypeScript</p>
                    <p>✅ Frontend: React + Vite + TailwindCSS</p>
                    <p>✅ Mobile: React Native (em desenvolvimento)</p>
                    <p>✅ Integração SIGE Cloud</p>
                  </div>
                </div>
              </div>
            } />
            {/* Rotas adicionais serão adicionadas aqui */}
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

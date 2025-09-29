import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Technicians from './pages/Technicians';
import Resources from './pages/Resources';
import Informe from './pages/Informe';
import Registros from './pages/Registros';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/technicians"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Technicians />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Resources />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/informe"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Informe />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/registros"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Registros />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
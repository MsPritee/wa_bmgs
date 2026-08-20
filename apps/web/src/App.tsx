import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ConversationsPage from './pages/ConversationsPage';
import ConversationDetailPage from './pages/ConversationDetailPage';
import CustomersPage from './pages/CustomersPage';
import MenusPage from './pages/MenusPage';
import WorkflowsPage from './pages/WorkflowsPage';
import EntitiesPage from './pages/EntitiesPage';
import TemplatesPage from './pages/TemplatesPage';
import AgentsPage from './pages/AgentsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/conversations/:id" element={<ConversationDetailPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/business-data" element={<EntitiesPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
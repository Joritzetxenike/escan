import { AuthProvider, useAuth } from './auth/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

function AuthenticatedApp() {
  const { user, isAdmin, loading, error, signOut } = useAuth();

  if (loading) {
    return <div className="full-screen-message">Cargando…</div>;
  }

  if (error) {
    return (
      <div className="full-screen-message full-screen-error">
        {error.message}
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAdmin) {
    return (
      <div className="full-screen-message">
        El usuario no tiene permiso de administrador.
        <button className="button button-secondary" type="button" onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

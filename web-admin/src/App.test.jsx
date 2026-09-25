import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App';
import { useAuth } from './auth/AuthContext';

vi.mock('./auth/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>Pantalla de acceso</div>,
}));

vi.mock('./pages/DashboardPage', () => ({
  default: () => <div>Panel de control</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('muestra el acceso cuando no hay sesión', () => {
    useAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument();
  });

  test('bloquea a usuarios sin rol administrador', () => {
    useAuth.mockReturnValue({
      user: { email: 'user@example.com' },
      isAdmin: false,
      loading: false,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);

    expect(
      screen.getByText('El usuario no tiene permiso de administrador.'),
    ).toBeInTheDocument();
  });

  test('muestra el panel a administradores', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@example.com' },
      isAdmin: true,
      loading: false,
      error: null,
      signOut: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Panel de control')).toBeInTheDocument();
  });
});

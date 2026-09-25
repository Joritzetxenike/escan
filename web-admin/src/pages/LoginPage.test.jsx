import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LoginPage from './LoginPage';
import { useAuth } from '../auth/AuthContext';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('muestra un error si falla el inicio de sesión', async () => {
    useAuth.mockReturnValue({
      signIn: vi.fn().mockRejectedValue(new Error('Error de red')),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Error de red')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { useAuth } from '../auth/AuthContext';
import { obtenerResumen } from '../services/inventoryApi';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/inventoryApi', () => ({
  obtenerResumen: vi.fn(),
}));

vi.mock('../components/LocationDetail', () => ({
  default: () => <div>Detalle de ubicación</div>,
}));

vi.mock('../components/LocationTree', () => ({
  default: () => <div>Árbol de ubicaciones</div>,
}));

const emptyStatusSummary = {
  Inicio: { cantidad: 0, porcentaje: 0 },
  Proceso: { cantidad: 0, porcentaje: 0 },
  Fin: { cantidad: 0, porcentaje: 0 },
};

const resumen = {
  secciones: { total: 1, desglose: { ...emptyStatusSummary, Inicio: { cantidad: 1, porcentaje: 100 } } },
  areas: { total: 1, desglose: { ...emptyStatusSummary, Inicio: { cantidad: 1, porcentaje: 100 } } },
  ubicaciones: {
    total: 1,
    desglose: { ...emptyStatusSummary, Inicio: { cantidad: 1, porcentaje: 100 } },
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: { email: 'admin@example.com' },
      signOut: vi.fn(),
    });
    obtenerResumen.mockResolvedValue(resumen);
  });

  test('inicia en consulta y permite activar edición', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Modo consulta')).toBeInTheDocument();
    expect(screen.getByText('Los datos son de solo lectura.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Modificar datos' }));

    await waitFor(() => {
      expect(screen.getByText('Modo edición')).toBeInTheDocument();
    });
    expect(screen.getByText('Puedes cambiar el estado de una ubicación.')).toBeInTheDocument();
  });
});

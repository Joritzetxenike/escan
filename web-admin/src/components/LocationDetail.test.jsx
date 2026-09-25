import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LocationDetail from './LocationDetail';
import {
  actualizarEstadoUbicacion,
  obtenerArticulosUbicacion,
} from '../services/inventoryApi';

vi.mock('../services/inventoryApi', () => ({
  actualizarEstadoUbicacion: vi.fn(),
  obtenerArticulosUbicacion: vi.fn(),
}));

const location = {
  seccion: '01',
  area: 'A',
  subzona: 'Z1',
  ubicacion: '01-A-Z1',
  stat: 'Inicio',
};

describe('LocationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerArticulosUbicacion.mockResolvedValue({
      items: [
        {
          articulo: '123',
          descripcion: 'Artículo de prueba',
          tipo: 'MRP',
          cantidad: 4,
        },
      ],
      total: 1,
    });
    actualizarEstadoUbicacion.mockResolvedValue({
      area_stat: 'Proceso',
      seccion_stat: 'Proceso',
    });
  });

  test('muestra artículos y permite actualizar el estado', async () => {
    const onUpdated = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <LocationDetail
        location={location}
        editMode
        onUpdated={onUpdated}
      />,
    );

    expect(await screen.findByText('Artículo de prueba')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cambiar estado'), {
      target: { value: 'Fin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }));

    await waitFor(() => {
      expect(actualizarEstadoUbicacion).toHaveBeenCalledWith({
        seccion: '01',
        area: 'A',
        subzona: 'Z1',
        stat: 'Fin',
      });
    });
    expect(onUpdated).toHaveBeenCalledWith({ ...location, stat: 'Fin' });
  });

  test('mantiene el modo consulta sin editor', async () => {
    render(
      <LocationDetail
        location={location}
        editMode={false}
        onUpdated={vi.fn()}
      />,
    );

    expect(await screen.findByText('Artículo de prueba')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cambiar estado')).not.toBeInTheDocument();
  });
});

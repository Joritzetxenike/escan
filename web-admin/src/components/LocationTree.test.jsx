import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LocationTree from './LocationTree';
import {
  listarAreas,
  listarSecciones,
  listarUbicacionesDeArea,
} from '../services/inventoryApi';

vi.mock('../services/inventoryApi', () => ({
  listarSecciones: vi.fn(),
  listarAreas: vi.fn(),
  listarUbicacionesDeArea: vi.fn(),
}));

describe('LocationTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarSecciones.mockResolvedValue([{ seccion: '01', stat: 'Inicio' }]);
    listarAreas.mockResolvedValue([{ area: 'A', stat: 'Proceso' }]);
    listarUbicacionesDeArea.mockResolvedValue([
      { seccion: '01', area: 'A', subzona: 'Z1', stat: 'Fin' },
    ]);
  });

  test('despliega por niveles y carga datos de forma perezosa', async () => {
    const onSelect = vi.fn();
    render(<LocationTree selectedLocation={null} onSelect={onSelect} />);

    expect(await screen.findByText('Sección 01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sección 01/i }));
    expect(await screen.findByText('Área A')).toBeInTheDocument();
    expect(listarAreas).toHaveBeenCalledWith('01');

    fireEvent.click(screen.getByRole('button', { name: /Área A/i }));
    expect(await screen.findByText('01-A-Z1')).toBeInTheDocument();
    expect(listarUbicacionesDeArea).toHaveBeenCalledWith('01', 'A');

    fireEvent.click(screen.getByRole('button', { name: /01-A-Z1/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        seccion: '01',
        area: 'A',
        subzona: 'Z1',
        ubicacion: '01-A-Z1',
      }),
    );
  });

  test('el botón Planos de una sección avisa sin desplegarla', async () => {
    const onVerPlanos = vi.fn();
    render(
      <LocationTree selectedLocation={null} onSelect={vi.fn()} onVerPlanos={onVerPlanos} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Ver planos de 01' }));

    expect(onVerPlanos).toHaveBeenCalledWith({ seccion: '01' });
    expect(listarAreas).not.toHaveBeenCalled();
  });

  test('sin onVerPlanos no hay botón Planos', async () => {
    render(<LocationTree selectedLocation={null} onSelect={vi.fn()} />);

    await screen.findByText('Sección 01');
    expect(screen.queryByRole('button', { name: /Ver planos/ })).not.toBeInTheDocument();
  });

  test('no vuelve a pedir áreas ni ubicaciones ya cargadas', async () => {
    render(<LocationTree selectedLocation={null} onSelect={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Sección 01/i }));
    await screen.findByText('Área A');
    fireEvent.click(screen.getByRole('button', { name: /Sección 01/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sección 01/i }));

    expect(listarAreas).toHaveBeenCalledTimes(1);
  });
});
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import PlanosModal from './PlanosModal';
import { borrarPlano, listarPlanos, subirPlano, urlPlano } from '../services/planosApi';

vi.mock('../services/planosApi', () => ({
  listarPlanos: vi.fn(),
  urlPlano: vi.fn(),
  subirPlano: vi.fn(),
  borrarPlano: vi.fn(),
}));

const PDF = { nombre: 'general.pdf', ruta: 'LIN2/general.pdf', tipo: 'pdf', bytes: 2048 };
const IMG = { nombre: 'detalle.png', ruta: 'LIN2/A01/detalle.png', tipo: 'imagen', bytes: 10 };

describe('PlanosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarPlanos.mockImplementation(async (seccion, area) => (area ? [IMG] : [PDF]));
    urlPlano.mockImplementation(async (ruta) => `https://firmada/${ruta}`);
  });

  test('lista los planos de sección y área y abre el primero (PDF en el visor)', async () => {
    render(<PlanosModal seccion="LIN2" area="A01" editMode={false} onCerrar={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /general.pdf/ })).toBeInTheDocument();
    expect(screen.getByText('detalle.png')).toBeInTheDocument();
    expect(listarPlanos).toHaveBeenCalledWith('LIN2');
    expect(listarPlanos).toHaveBeenCalledWith('LIN2', 'A01');

    const visor = await screen.findByTitle('Plano general.pdf');
    expect(visor.tagName).toBe('IFRAME');
    expect(visor).toHaveAttribute('src', 'https://firmada/LIN2/general.pdf');
  });

  test('una imagen se muestra como imagen', async () => {
    render(<PlanosModal seccion="LIN2" area="A01" editMode={false} onCerrar={vi.fn()} />);

    fireEvent.click(await screen.findByText('detalle.png'));

    const img = await screen.findByAltText('Plano detalle.png');
    expect(img).toHaveAttribute('src', 'https://firmada/LIN2/A01/detalle.png');
  });

  test('sin planos avisa y en consulta no deja subir', async () => {
    listarPlanos.mockResolvedValue([]);

    render(<PlanosModal seccion="LIN9" editMode={false} onCerrar={vi.fn()} />);

    expect(await screen.findByText(/no tiene planos/i)).toBeInTheDocument();
    expect(screen.queryByText('Subir plano')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  });

  test('en modo edición sube al área elegida y recarga', async () => {
    subirPlano.mockResolvedValue({ ruta: 'LIN2/A01/nuevo.pdf', nombre: 'nuevo.pdf' });

    render(<PlanosModal seccion="LIN2" area="A01" editMode onCerrar={vi.fn()} />);
    await screen.findByRole('button', { name: /general.pdf/ });

    const fichero = new File(['%PDF'], 'nuevo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Fichero del plano'), { target: { files: [fichero] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    await waitFor(() =>
      expect(subirPlano).toHaveBeenCalledWith({ seccion: 'LIN2', area: 'A01', fichero }),
    );
    expect(await screen.findByText('Plano «nuevo.pdf» subido.')).toBeInTheDocument();
    expect(listarPlanos).toHaveBeenCalledTimes(4);
  });

  test('si ya existe, pregunta y sobrescribe solo si se acepta', async () => {
    const duplicado = Object.assign(new Error('Ya existe un plano llamado «general.pdf»'), {
      duplicado: true,
    });
    subirPlano
      .mockRejectedValueOnce(duplicado)
      .mockResolvedValueOnce({ ruta: 'LIN2/general.pdf', nombre: 'general.pdf' });
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PlanosModal seccion="LIN2" editMode onCerrar={vi.fn()} />);
    await screen.findByRole('button', { name: /general.pdf/ });

    const fichero = new File(['%PDF'], 'general.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Fichero del plano'), { target: { files: [fichero] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    await waitFor(() => expect(subirPlano).toHaveBeenCalledTimes(2));
    expect(confirmar).toHaveBeenCalled();
    expect(subirPlano).toHaveBeenLastCalledWith(expect.objectContaining({ sobrescribir: true }));
    confirmar.mockRestore();
  });

  test('borrar pide confirmación', async () => {
    borrarPlano.mockResolvedValue(true);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<PlanosModal seccion="LIN2" editMode onCerrar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));

    expect(confirmar).toHaveBeenCalled();
    expect(borrarPlano).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(borrarPlano).toHaveBeenCalledWith('LIN2/general.pdf'));
    confirmar.mockRestore();
  });

  test('se cierra con el botón y con Escape', async () => {
    const onCerrar = vi.fn();
    render(<PlanosModal seccion="LIN2" editMode={false} onCerrar={onCerrar} />);
    await screen.findByRole('button', { name: /general.pdf/ });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  test('muestra el error de carga con reintento', async () => {
    listarPlanos.mockRejectedValueOnce(new Error('sin permiso'));

    render(<PlanosModal seccion="LIN2" editMode={false} onCerrar={vi.fn()} />);

    expect(await screen.findByText(/sin permiso/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: /general.pdf/ })).toBeInTheDocument();
  });
});

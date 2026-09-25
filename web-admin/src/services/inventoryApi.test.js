import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getSupabase } from '../lib/supabase';
import {
  actualizarEstadoUbicacion,
  listarUbicaciones,
  obtenerArticulosUbicacion,
  obtenerResumen,
} from './inventoryApi';

vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

function createQuery(result) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    range: vi.fn(() => query),
    then: (resolve) => Promise.resolve(resolve(result)),
  };

  return query;
}

describe('inventoryApi', () => {
  let client;
  let query;

  beforeEach(() => {
    query = createQuery({ data: [], error: null, count: 0 });
    client = {
      from: vi.fn(() => query),
      rpc: vi.fn(),
    };
    getSupabase.mockReturnValue(client);
  });

  test('obtiene y resume el árbol de ubicaciones', async () => {
    query = createQuery({
      data: [
        {
          seccion: '01',
          stat: 'Inicio',
          maestroArea: [
            {
              area: 'A',
              stat: 'Inicio',
              maestroUbicacion: [{ subzona: 'Z1', stat: 'Inicio' }],
            },
          ],
        },
      ],
      error: null,
    });
    client.from.mockReturnValue(query);

    const result = await obtenerResumen();

    expect(result.ubicaciones.total).toBe(1);
    expect(client.from).toHaveBeenCalledWith('maestroSeccion');
  });

  test('mapea y pagina ubicaciones', async () => {
    query = createQuery({
      data: [{ seccion: '01', area: 'A', subzona: 'Z1', stat: 'Fin' }],
      count: 1,
      error: null,
    });
    client.from.mockReturnValue(query);

    const result = await listarUbicaciones({ page: 2, pageSize: 10 });

    expect(result.items[0].ubicacion).toBe('01-A-Z1');
    expect(query.range).toHaveBeenCalledWith(10, 19);
  });

  test('mapea artículos de una ubicación', async () => {
    query = createQuery({
      data: [
        {
          ubicacion: '01-A-Z1',
          item: '123',
          cant: 4,
          maestroArticulo: { dsca: 'Artículo', tipo: 'MRP' },
        },
      ],
      count: 1,
      error: null,
    });
    client.from.mockReturnValue(query);

    const result = await obtenerArticulosUbicacion({
      ubicacion: '01-A-Z1',
    });

    expect(result.items[0]).toEqual({
      ubicacion: '01-A-Z1',
      articulo: '123',
      cantidad: 4,
      descripcion: 'Artículo',
      tipo: 'MRP',
    });
  });

  test('llama a la RPC para actualizar el estado', async () => {
    client.rpc.mockResolvedValue({ data: { stat: 'Fin' }, error: null });

    await actualizarEstadoUbicacion({
      seccion: '01',
      area: 'A',
      subzona: 'Z1',
      stat: 'Fin',
    });

    expect(client.rpc).toHaveBeenCalledWith('actualizar_estado_ubicacion', {
      p_seccion: '01',
      p_area: 'A',
      p_subzona: 'Z1',
      p_stat: 'Fin',
    });
  });

  test('rechaza estados no permitidos antes de llamar a Supabase', async () => {
    await expect(
      actualizarEstadoUbicacion({
        seccion: '01',
        area: 'A',
        subzona: 'Z1',
        stat: 'Otro',
      }),
    ).rejects.toThrow('estado seleccionado');

    expect(client.rpc).not.toHaveBeenCalled();
  });
});

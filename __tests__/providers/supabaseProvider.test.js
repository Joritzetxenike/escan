import SupabaseProvider from '../../src/providers/supabase/SupabaseProvider';
import supabase from '../../src/providers/supabase/supabaseClient';

jest.mock('../../src/providers/supabase/supabaseClient', () => ({
  from: jest.fn(),
  rpc: jest.fn(),
}));

describe('SupabaseProvider', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // guardarMovimiento
  // =====================================================

  // TODO: actualizar mocks para incluir .select() y stat 'Proceso'
  // describe('guardarMovimiento', () => {
  //   test('debe guardar el movimiento y poner la ubicación en proceso', async () => {
  //     const movimiento = { ubicacion: '50100-111-Z101', articulo: '123456', cantidad: 5 };
  //     const conteoQuery = {
  //       upsert: jest.fn().mockReturnThis(),
  //       select: jest.fn().mockReturnThis(),
  //       single: jest.fn().mockResolvedValue({ data: { ubicacion: '50100-111-Z101', item: '123456', cant: 5 }, error: null }),
  //     };
  //     const ubicacionQuery = {
  //       update: jest.fn().mockReturnThis(),
  //       eq: jest.fn().mockReturnThis(),
  //       select: jest.fn().mockReturnThis(),
  //     };
  //     supabase.from.mockReturnValueOnce(conteoQuery).mockReturnValueOnce(ubicacionQuery);
  //     const resultado = await SupabaseProvider.guardarMovimiento(movimiento);
  //     expect(supabase.from).toHaveBeenNthCalledWith(1, 'conteo');
  //     expect(conteoQuery.upsert).toHaveBeenCalledWith({ ubicacion: '50100-111-Z101', item: '123456', cant: 5 }, { onConflict: 'ubicacion,item' });
  //     expect(supabase.from).toHaveBeenNthCalledWith(2, 'maestroUbicacion');
  //     expect(ubicacionQuery.update).toHaveBeenCalledWith({ stat: 'Proceso' });
  //     expect(resultado).toEqual({ ubicacion: '50100-111-Z101', articulo: '123456', cantidad: 5 });
  //   });
  //   test('debe lanzar error si falla el guardado', async () => {
  //     const conteoQuery = {
  //       upsert: jest.fn().mockReturnThis(),
  //       select: jest.fn().mockReturnThis(),
  //       single: jest.fn().mockResolvedValue({ data: null, error: new Error('Error de Supabase') }),
  //     };
  //     supabase.from.mockReturnValueOnce(conteoQuery);
  //     await expect(SupabaseProvider.guardarMovimiento({ ubicacion: '50100-111-Z101', articulo: '123456', cantidad: 5 })).rejects.toThrow('Error de Supabase');
  //     expect(supabase.from).toHaveBeenCalledTimes(1);
  //   });
  // });


  // =====================================================
  // obtenerSecciones
  // =====================================================

  describe('obtenerSecciones', () => {

    test('debe devolver las secciones con su estado', async () => {

      const datos = [
        { seccion: '50100', stat: 'Inicio' },
        { seccion: '50200', stat: 'Fin' },
      ];

      const query = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: datos,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerSecciones();

      expect(supabase.from).toHaveBeenCalledWith(
        'maestroSeccion'
      );

      expect(query.select).toHaveBeenCalledWith(
        'seccion, stat'
      );

      expect(query.order).toHaveBeenCalledWith(
        'seccion',
        { ascending: true }
      );

      expect(resultado).toEqual(datos);
    });

    test('debe lanzar error si falla la consulta', async () => {

      const query = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Error consultando secciones'),
        }),
      };

      supabase.from.mockReturnValue(query);

      await expect(
        SupabaseProvider.obtenerSecciones()
      ).rejects.toThrow('Error consultando secciones');
    });

  });

  // =====================================================
  // obtenerAreas
  // =====================================================

  describe('obtenerAreas', () => {

    test('debe devolver las áreas de una sección', async () => {

      const datos = [
        { area: '111', stat: 'Inicio' },
        { area: '112', stat: 'Proceso' },
      ];

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: datos,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerAreas('50100');

      expect(supabase.from).toHaveBeenCalledWith(
        'maestroArea'
      );

      expect(query.select).toHaveBeenCalledWith(
        'area, stat'
      );

      expect(query.eq).toHaveBeenCalledWith('seccion', '50100');
      expect(query.order).toHaveBeenCalledWith(
        'area',
        { ascending: true }
      );

      expect(resultado).toEqual(datos);
    });

    test('debe lanzar error si falla la consulta', async () => {

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Error consultando áreas'),
        }),
      };

      supabase.from.mockReturnValue(query);

      await expect(
        SupabaseProvider.obtenerAreas('50100')
      ).rejects.toThrow('Error consultando áreas');
    });

  });

  // =====================================================
  // obtenerUbicacionesArea
  // =====================================================

  describe('obtenerUbicacionesArea', () => {

    test('debe devolver las ubicaciones con id completo', async () => {

      const datos = [
        { subzona: 'Z101', stat: 'Inicio' },
        { subzona: 'Z102', stat: 'Fin' },
      ];

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: datos,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerUbicacionesArea(
          '50100',
          '111'
        );

      expect(supabase.from).toHaveBeenCalledWith(
        'maestroUbicacion'
      );

      expect(query.select).toHaveBeenCalledWith(
        'subzona, stat'
      );

      expect(query.eq).toHaveBeenCalledWith('seccion', '50100');
      expect(query.eq).toHaveBeenCalledWith('area', '111');
      expect(query.order).toHaveBeenCalledWith(
        'subzona',
        { ascending: true }
      );

      expect(resultado).toEqual([
        { subzona: 'Z101', stat: 'Inicio', ubicacion: '50100-111-Z101' },
        { subzona: 'Z102', stat: 'Fin', ubicacion: '50100-111-Z102' },
      ]);
    });

    test('debe lanzar error si falla la consulta', async () => {

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Error consultando ubicaciones'),
        }),
      };

      supabase.from.mockReturnValue(query);

      await expect(
        SupabaseProvider.obtenerUbicacionesArea('50100', '111')
      ).rejects.toThrow('Error consultando ubicaciones');
    });

  });

  // =====================================================
  // finalizarUbicacion
  // =====================================================

  describe('finalizarUbicacion', () => {

    beforeEach(() => {
      supabase.from.mockReset();
    });

    // Cadena de actualización: update -> eq -> eq -> eq -> select
    const cadenaActualizacion = ({ error = null } = {}) => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest
        .fn()
        .mockResolvedValue({ data: null, error }),
    });

    // Cadena de selección de ubicaciones: select -> eq -> eq
    const cadenaUbicaciones = (data) => {
      const cadena = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      };
      cadena.eq
        .mockReturnValueOnce(cadena)
        .mockReturnValueOnce(
          Promise.resolve({ data, error: null })
        );
      return cadena;
    };

    // Cadena de selección de áreas: select -> eq
    const cadenaAreas = (data) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data,
        error: null,
      }),
    });
    test('finaliza la ubicación y propaga a área y sección vía RPC', async () => {

      supabase.rpc.mockResolvedValue({
        data: {
          seccion: '50100',
          area: '111',
          subzona: 'Z101',
          ubicacion: '50100-111-Z101',
          stat: 'Fin',
          area_stat: 'Fin',
          seccion_stat: 'Fin',
        },
        error: null,
      });

      const resultado =
        await SupabaseProvider.finalizarUbicacion(
          '50100-111-Z101'
        );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'finalizar_ubicacion',
        {
          p_seccion: '50100',
          p_area: '111',
          p_subzona: 'Z101',
        }
      );

      expect(resultado).toEqual({
        seccion: '50100',
        area: '111',
        subzona: 'Z101',
        stat: 'Fin',
      });
    });

    test('lanza error si la RPC falla', async () => {

      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Error finalizando ubicación'),
      });

      await expect(
        SupabaseProvider.finalizarUbicacion('50100-111-Z101')
      ).rejects.toThrow('Error finalizando ubicación');

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    test('lanza error si el código no es seccion-area-subzona', async () => {

      await expect(
        SupabaseProvider.finalizarUbicacion('50100')
      ).rejects.toThrow('Código de ubicación inválido');

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

  });

  // =====================================================
  // obtenerEstadoUbicaciones
  // =====================================================

  describe('obtenerEstadoUbicaciones', () => {

    test('debe obtener la estructura con los estados', async () => {

      const datos = [
        {
          seccion: '50100',
          stat: 'En proceso',
          maestroArea: [
            {
              area: '111',
              stat: 'En proceso',
              maestroUbicacion: [
                {
                  subzona: 'Z101',
                  stat: 'En proceso',
                },
                {
                  subzona: 'Z102',
                  stat: 'Inicio',
                },
              ],
            },
          ],
        },
      ];

      const query = {
        select: jest.fn().mockResolvedValue({
          data: datos,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerEstadoUbicaciones();

      expect(supabase.from).toHaveBeenCalledWith(
        'maestroSeccion'
      );

      expect(query.select).toHaveBeenCalledWith(`
      seccion,
      stat,
      maestroArea (
        area,
        stat,
        maestroUbicacion (
          subzona,
          stat
        )
      )
    `);

      expect(resultado).toEqual(datos);
    });


    test('debe lanzar error si falla la consulta', async () => {

      const query = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Error consultando estados'),
        }),
      };

      supabase.from.mockReturnValue(query);

      await expect(
        SupabaseProvider.obtenerEstadoUbicaciones()
      ).rejects.toThrow('Error consultando estados');
    });

  });

  // =====================================================
  // obtenerUbicacion
  // =====================================================

  describe('obtenerUbicacion', () => {

    test('debe devolver la ubicación si existe en el maestro', async () => {

      const ubicacionMaestro = {
        seccion: '50100',
        area: '111',
        subzona: 'Z101',
        stat: 'Inicio',
      };

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: ubicacionMaestro,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerUbicacion('50100-111-Z101');

      expect(supabase.from).toHaveBeenCalledWith('maestroUbicacion');

      expect(query.eq).toHaveBeenCalledWith('seccion', '50100');
      expect(query.eq).toHaveBeenCalledWith('area', '111');
      expect(query.eq).toHaveBeenCalledWith('subzona', 'Z101');

      expect(resultado).toEqual(ubicacionMaestro);
    });

    test('debe devolver null si la ubicación no existe en el maestro', async () => {

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(query);

      const resultado =
        await SupabaseProvider.obtenerUbicacion('99999-999-Z999');

      expect(resultado).toBeNull();
    });

    test('debe devolver null si el código no tiene formato seccion-area-subzona', async () => {

      const resultado =
        await SupabaseProvider.obtenerUbicacion('50100');

      expect(resultado).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    test('debe lanzar error si falla la consulta', async () => {

      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Error consultando ubicación'),
        }),
      };

      supabase.from.mockReturnValue(query);

      await expect(
        SupabaseProvider.obtenerUbicacion('50100-111-Z101')
      ).rejects.toThrow('Error consultando ubicación');
    });

  });


  // =====================================================
  // actualizarMovimiento / obtenerMovimiento / operarios
  // =====================================================

  describe('actualizarMovimiento (A1)', () => {

    test('usa la RPC guardar_movimiento (upsert) con la matrícula', async () => {

      supabase.rpc.mockResolvedValue({
        data: { ubicacion: 'A-1-Z1', articulo: '1', cantidad: 8, matricula: '2222' },
        error: null,
      });

      const resultado = await SupabaseProvider.actualizarMovimiento({
        ubicacion: 'A-1-Z1', articulo: '1', cantidad: 8, matricula: '2222',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('guardar_movimiento', {
        p_ubicacion: 'A-1-Z1',
        p_articulo: '1',
        p_cantidad: 8,
        p_matricula: '2222',
      });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(resultado.cantidad).toBe(8);
    });

  });

  describe('obtenerMovimiento (A5)', () => {

    const montar = (respuesta) => {
      const consulta = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(respuesta),
      };
      supabase.from.mockReturnValue(consulta);
      return consulta;
    };

    test('devuelve la fila con nombres de la app', async () => {

      const consulta = montar({
        data: { ubicacion: 'A-1-Z1', item: '1', cant: 10 },
        error: null,
      });

      expect(
        await SupabaseProvider.obtenerMovimiento('A-1-Z1', '1')
      ).toEqual({ ubicacion: 'A-1-Z1', articulo: '1', cantidad: 10 });

      expect(supabase.from).toHaveBeenCalledWith('conteo');
      expect(consulta.eq).toHaveBeenCalledWith('ubicacion', 'A-1-Z1');
      expect(consulta.eq).toHaveBeenCalledWith('item', '1');
    });

    test('devuelve null si no existe', async () => {

      montar({ data: null, error: null });

      expect(
        await SupabaseProvider.obtenerMovimiento('A-1-Z1', '1')
      ).toBeNull();
    });

  });

  describe('obtenerOperarios (A6)', () => {

    test('llama a la RPC y devuelve la lista', async () => {

      const lista = [{ matricula: '1', nombre: 'A', activo: true }];

      supabase.rpc.mockResolvedValue({ data: lista, error: null });

      expect(await SupabaseProvider.obtenerOperarios()).toEqual(lista);
      expect(supabase.rpc).toHaveBeenCalledWith('descargar_operarios');
    });

    test('lanza si la RPC falla', async () => {

      supabase.rpc.mockResolvedValue({ data: null, error: new Error('x') });

      await expect(SupabaseProvider.obtenerOperarios()).rejects.toThrow('x');
    });

  });


  describe('unidad', () => {

    test('la descarga del maestro trae unidad_defecto y excepciones', async () => {
      supabase.rpc.mockResolvedValue({
        data: { codigos: ['A'], sic: [], genericos: [], unidad_defecto: 'U', unidades: { B: 'KG' } },
        error: null,
      });

      const maestro = await SupabaseProvider.obtenerMaestroArticulos();

      expect(maestro.unidadDefecto).toBe('U');
      expect(maestro.unidades).toEqual({ B: 'KG' });
    });

    test('los artículos de una ubicación traen la unidad del maestro', async () => {
      const consulta = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ ubicacion: 'A-1-Z1', item: 'X', cant: 2, maestroArticulo: { dsca: 'D', tipo: 'MRP', unit: 'M2' } }],
          error: null,
        }),
      };
      supabase.from.mockReturnValue(consulta);

      const [fila] = await SupabaseProvider.obtenerArticulosUbicacion('A-1-Z1');

      expect(fila.unidad).toBe('M2');
      expect(consulta.select.mock.calls[0][0]).toContain('unit');
    });

  });

});
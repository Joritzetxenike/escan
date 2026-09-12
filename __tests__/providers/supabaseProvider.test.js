import SupabaseProvider from '../../src/providers/supabase/SupabaseProvider';
import supabase from '../../src/providers/supabase/supabaseClient';

jest.mock('../../src/providers/supabase/supabaseClient', () => ({
  from: jest.fn(),
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

});
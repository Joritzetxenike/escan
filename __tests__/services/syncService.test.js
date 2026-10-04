import syncService from '../../src/services/syncService';
import DataProvider from '../../src/providers/DataProvider';
import pendientesService from '../../src/services/pendientesService';

jest.mock('../../src/providers/DataProvider', () => ({
  guardarMovimiento: jest.fn(),
  actualizarMovimiento: jest.fn(),
  eliminarMovimiento: jest.fn(),
  finalizarUbicacion: jest.fn(),
  obtenerArticulo: jest.fn(),
  obtenerUbicacion: jest.fn(),
}));

jest.mock('../../src/services/pendientesService', () => ({
  TIPOS: {
    GUARDAR: 'guardar',
    ACTUALIZAR: 'actualizar',
    ELIMINAR: 'eliminar',
    FINALIZAR: 'finalizar',
  },
  listar: jest.fn(),
  quitar: jest.fn(),
  registrarFallo: jest.fn(),
  tieneFinalizacionPendiente: jest.fn(),
  contar: jest.fn(),
  encolar: jest.fn(),
  vaciar: jest.fn(),
}));

const opGuardar = (extra = {}) => ({
  operation_id: 'op-1',
  tipo: 'guardar',
  ubicacion: 'A1',
  articulo: '123456',
  cantidad: 5,
  created_at: '2026-10-04T10:00:00.000Z',
  intentos: 0,
  ultimo_error: null,
  provisional: false,
  ubicacion_provisional: false,
  ...extra,
});

describe('syncService', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    pendientesService.listar.mockResolvedValue([]);

    pendientesService.quitar.mockResolvedValue(true);

    pendientesService.registrarFallo
      .mockResolvedValue(true);

    DataProvider.obtenerArticulo.mockResolvedValue({
      item: '123456',
    });

    DataProvider.obtenerUbicacion.mockResolvedValue({
      seccion: 'A',
      area: '1',
      subzona: '1',
    });
  });


  // =====================================================
  // VACÍA
  // =====================================================

  describe('cola vacía', () => {

    test('no hace nada', async () => {

      const resumen = await syncService.sincronizar();

      expect(resumen).toEqual({
        aplicadas: 0,
        fallidas: 0,
        errores: [],
        redCaida: false,
      });

      expect(
        DataProvider.guardarMovimiento
      ).not.toHaveBeenCalled();
    });

  });


  // =====================================================
  // ENVÍO
  // =====================================================

  describe('envío de operaciones', () => {

    test('envía y quita la operación de la cola', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar(),
      ]);

      const resumen = await syncService.sincronizar();

      expect(
        DataProvider.guardarMovimiento
      ).toHaveBeenCalledWith({
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      expect(pendientesService.quitar)
        .toHaveBeenCalledWith('op-1');

      expect(resumen.aplicadas).toBe(1);
      expect(resumen.fallidas).toBe(0);
    });

    test('envía cada tipo de operación a su método', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ operation_id: 'op-1' }),
        opGuardar({
          operation_id: 'op-2',
          tipo: 'actualizar',
          cantidad: 9,
        }),
        opGuardar({
          operation_id: 'op-3',
          tipo: 'eliminar',
        }),
        opGuardar({
          operation_id: 'op-4',
          tipo: 'finalizar',
        }),
      ]);

      await syncService.sincronizar();

      expect(
        DataProvider.actualizarMovimiento
      ).toHaveBeenCalledWith({
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 9,
      });

      expect(
        DataProvider.eliminarMovimiento
      ).toHaveBeenCalledWith('A1', '123456');

      expect(
        DataProvider.finalizarUbicacion
      ).toHaveBeenCalledWith('A1');
    });

    test('respeta el orden de las operaciones', async () => {

      const orden = [];

      pendientesService.listar.mockResolvedValue([
        opGuardar({ operation_id: 'op-1' }),
        opGuardar({
          operation_id: 'op-2',
          tipo: 'eliminar',
        }),
      ]);

      DataProvider.guardarMovimiento.mockImplementation(
        async () => orden.push('guardar')
      );

      DataProvider.eliminarMovimiento.mockImplementation(
        async () => orden.push('eliminar')
      );

      await syncService.sincronizar();

      expect(orden).toEqual(['guardar', 'eliminar']);
    });

    test('conserva la operación si el envío falla por red y para todo', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ operation_id: 'op-1' }),
        opGuardar({
          operation_id: 'op-2',
          articulo: '999999',
        }),
      ]);

      DataProvider.guardarMovimiento.mockRejectedValue(
        new TypeError('Network request failed')
      );

      const resumen = await syncService.sincronizar();

      expect(resumen.redCaida).toBe(true);
      expect(resumen.aplicadas).toBe(0);

      expect(pendientesService.quitar).not.toHaveBeenCalled();

      expect(
        pendientesService.registrarFallo
      ).toHaveBeenCalledWith('op-1', 'Network request failed');

      /* No se intenta la segunda operación */
      expect(
        DataProvider.guardarMovimiento
      ).toHaveBeenCalledTimes(1);
    });

    test('un fallo que no es de red bloquea esa ubicación pero no las demás', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ operation_id: 'op-1' }),
        opGuardar({
          operation_id: 'op-2',
          articulo: '999999',
        }),
        opGuardar({
          operation_id: 'op-3',
          ubicacion: 'A2',
        }),
      ]);

      DataProvider.guardarMovimiento
        .mockRejectedValueOnce(
          new Error('violates foreign key constraint')
        )
        .mockResolvedValueOnce(true);

      const resumen = await syncService.sincronizar();

      expect(resumen.fallidas).toBe(1);
      expect(resumen.aplicadas).toBe(1);
      expect(resumen.errores[0].operation_id).toBe('op-1');

      /* La op que falló NO se quita de la cola */
      expect(pendientesService.quitar)
        .toHaveBeenCalledWith('op-3');

      expect(pendientesService.quitar)
        .not.toHaveBeenCalledWith('op-1');

      /* Y la siguiente de A1 ni se intenta */
      expect(DataProvider.guardarMovimiento)
        .toHaveBeenCalledTimes(2);
    });

  });


  // =====================================================
  // PROVISIONALES
  // =====================================================

  describe('códigos provisionales', () => {

    test('valida el artículo antes de aplicar', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ provisional: true }),
      ]);

      await syncService.sincronizar();

      expect(DataProvider.obtenerArticulo)
        .toHaveBeenCalledWith('123456');

      expect(DataProvider.guardarMovimiento)
        .toHaveBeenCalled();
    });

    test('no aplica si el artículo no existe en el maestro', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({
          provisional: true,
          operation_id: 'op-9',
        }),
      ]);

      DataProvider.obtenerArticulo.mockResolvedValue(null);

      const resumen = await syncService.sincronizar();

      expect(DataProvider.guardarMovimiento)
        .not.toHaveBeenCalled();

      expect(resumen.fallidas).toBe(1);

      expect(resumen.errores[0].mensaje).toBe(
        'El código 123456 no existe en el maestro'
      );

      expect(pendientesService.registrarFallo)
        .toHaveBeenCalledWith(
          'op-9',
          'El código 123456 no existe en el maestro'
        );
    });

    test('valida la ubicación si se escaneó sin validar', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ ubicacion_provisional: true }),
      ]);

      await syncService.sincronizar();

      expect(DataProvider.obtenerUbicacion)
        .toHaveBeenCalledWith('A1');

      expect(DataProvider.guardarMovimiento)
        .toHaveBeenCalled();
    });

    test('no aplica si la ubicación no existe en el maestro', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({
          ubicacion_provisional: true,
          operation_id: 'op-7',
        }),
      ]);

      DataProvider.obtenerUbicacion.mockResolvedValue(null);

      const resumen = await syncService.sincronizar();

      expect(DataProvider.guardarMovimiento)
        .not.toHaveBeenCalled();

      expect(resumen.errores[0].mensaje).toBe(
        'La ubicación A1 no existe en el maestro'
      );
    });

    test('no valida el artículo en una finalización', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({
          tipo: 'finalizar',
          articulo: null,
          provisional: true,
        }),
      ]);

      await syncService.sincronizar();

      expect(DataProvider.obtenerArticulo)
        .not.toHaveBeenCalled();

      expect(DataProvider.finalizarUbicacion)
        .toHaveBeenCalledWith('A1');
    });

    test('si falla la red al validar, para todo', async () => {

      pendientesService.listar.mockResolvedValue([
        opGuardar({ provisional: true }),
      ]);

      DataProvider.obtenerArticulo.mockRejectedValue(
        new TypeError('Network request failed')
      );

      const resumen = await syncService.sincronizar();

      expect(resumen.redCaida).toBe(true);
      expect(DataProvider.guardarMovimiento)
        .not.toHaveBeenCalled();
    });

  });

});
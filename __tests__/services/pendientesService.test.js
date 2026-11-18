import pendientesService from '../../src/services/pendientesService';
import syncService from '../../src/services/syncService';
import DataProvider from '../../src/providers/DataProvider';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('../../src/providers/DataProvider', () => ({
  guardarMovimiento: jest.fn(async () => ({})),
  actualizarMovimiento: jest.fn(async () => ({})),
  eliminarMovimiento: jest.fn(async () => true),
  finalizarUbicacion: jest.fn(async () => ({})),
  obtenerArticulo: jest.fn(),
  obtenerUbicacion: jest.fn(),
}));

/* =====================================================
 * COLA DE OPERACIONES PENDIENTES
 * ===================================================== */

const mockArchivos = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  getInfoAsync: jest.fn(async (path) => ({
    exists: Object.prototype.hasOwnProperty.call(
      mockArchivos,
      path
    ),
  })),
  readAsStringAsync: jest.fn(
    async (path) => mockArchivos[path] ?? ''
  ),
  writeAsStringAsync: jest.fn(async (path, contenido) => {
    mockArchivos[path] = contenido;
  }),
  moveAsync: jest.fn(async ({ from, to }) => {
    mockArchivos[to] = mockArchivos[from];
    delete mockArchivos[from];
  }),
  deleteAsync: jest.fn(async (path) => {
    delete mockArchivos[path];
  }),
}));

const ARCHIVO =
  'file:///test/pending-operations.json';

const colaEnDisco = () =>
  JSON.parse(mockArchivos[ARCHIVO]);

describe('pendientesService', () => {

  beforeEach(async () => {
    jest.clearAllMocks();

    Object.keys(mockArchivos).forEach(
      (key) => delete mockArchivos[key]
    );
  });


  // =====================================================
  // ENCOLAR
  // =====================================================

  describe('encolar', () => {

    test('crea la operación con todos los campos', async () => {

      const op = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: '50100-111-Z101',
        articulo: '123456',
        cantidad: 5,
      });

      expect(op).toEqual(
        expect.objectContaining({
          tipo: 'guardar',
          ubicacion: '50100-111-Z101',
          articulo: '123456',
          cantidad: 5,
          intentos: 0,
          ultimo_error: null,
          provisional: false,
          ubicacion_provisional: false,
        })
      );

      expect(typeof op.operation_id).toBe('string');
      expect(typeof op.created_at).toBe('string');

      expect(colaEnDisco().operaciones).toHaveLength(1);
    });

    test('genera operation_id distintos', async () => {

      const a = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '1',
        cantidad: 1,
      });

      const b = await pendientesService.encolar({
        tipo: 'eliminar',
        ubicacion: 'A1',
        articulo: '2',
      });

      expect(a.operation_id).not.toBe(b.operation_id);
    });

    test('fusiona dos guardados consecutivos del mismo artículo', async () => {

      const primera = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      const segunda = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 7,
      });

      const operaciones = colaEnDisco().operaciones;

      expect(operaciones).toHaveLength(1);
      expect(operaciones[0].cantidad).toBe(7);

      /* Se conserva el operation_id original */
      expect(segunda.operation_id).toBe(
        primera.operation_id
      );
    });

    test('no fusiona si el artículo es distinto', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '999999',
        cantidad: 5,
      });

      expect(
        colaEnDisco().operaciones
      ).toHaveLength(2);
    });

    test('NO fusiona un guardado seguido de un borrado', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      await pendientesService.encolar({
        tipo: 'eliminar',
        ubicacion: 'A1',
        articulo: '123456',
      });

      const operaciones = colaEnDisco().operaciones;

      expect(operaciones).toHaveLength(2);
      expect(operaciones[1].tipo).toBe('eliminar');
    });

    test('la fusión conserva la marca de provisional', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      await pendientesService.encolar({
        tipo: 'actualizar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 9,
        provisional: true,
      });

      const [op] = colaEnDisco().operaciones;

      expect(op.provisional).toBe(true);
      /* guardar + actualizar sigue siendo guardar (A1) */
      expect(op.tipo).toBe('guardar');
      expect(op.cantidad).toBe(9);
    });

    test('actualizar + actualizar sigue siendo actualizar', async () => {

      await pendientesService.encolar({
        tipo: 'actualizar', ubicacion: 'A1', articulo: '1', cantidad: 5,
      });

      await pendientesService.encolar({
        tipo: 'actualizar', ubicacion: 'A1', articulo: '1', cantidad: 6,
      });

      const operaciones = colaEnDisco().operaciones;

      expect(operaciones).toHaveLength(1);
      expect(operaciones[0].tipo).toBe('actualizar');
      expect(operaciones[0].cantidad).toBe(6);
    });

    test('guardar + editar sin conexión se sincroniza como guardado (A1)', async () => {

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 5, matricula: '1111',
      });

      await pendientesService.encolar({
        tipo: 'actualizar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 8, matricula: '2222',
      });

      const resumen = await syncService.sincronizar();

      expect(DataProvider.guardarMovimiento).toHaveBeenCalledWith({
        ubicacion: 'A-1-Z1',
        articulo: '1',
        cantidad: 8,
        matricula: '2222',
      });

      expect(DataProvider.actualizarMovimiento).not.toHaveBeenCalled();
      expect(resumen.fallidas).toBe(0);
      expect(colaEnDisco().operaciones).toHaveLength(0);
    });

  });


  // =====================================================
  // QUITAR / FALLOS
  // =====================================================

  describe('quitar', () => {

    test('elimina solo la operación indicada', async () => {

      const a = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '1',
        cantidad: 1,
      });

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A2',
        articulo: '2',
        cantidad: 1,
      });

      await pendientesService.quitar(a.operation_id);

      const operaciones = colaEnDisco().operaciones;

      expect(operaciones).toHaveLength(1);
      expect(operaciones[0].ubicacion).toBe('A2');
    });

  });

  describe('registrarFallo', () => {

    test('suma un intento y guarda el error sin borrar', async () => {

      const op = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '1',
        cantidad: 1,
      });

      await pendientesService.registrarFallo(
        op.operation_id,
        'Network request failed'
      );

      const [guardada] = colaEnDisco().operaciones;

      expect(guardada.intentos).toBe(1);
      expect(guardada.ultimo_error).toBe(
        'Network request failed'
      );
    });

  });


  // =====================================================
  // CONSULTAS
  // =====================================================

  describe('listar / contar', () => {

    test('devuelve vacío si no hay fichero', async () => {
      expect(await pendientesService.listar()).toEqual([]);
      expect(await pendientesService.contar()).toBe(0);
    });

    test('cuenta las operaciones pendientes', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '1',
      });

      await pendientesService.encolar({
        tipo: 'eliminar',
        ubicacion: 'A2',
        articulo: '2',
      });

      expect(await pendientesService.contar()).toBe(2);
    });

  });


  describe('tieneFinalizacionPendiente', () => {

    test('detecta la finalización pendiente de la ubicación', async () => {

      await pendientesService.encolar({
        tipo: 'finalizar',
        ubicacion: '50100-111-Z101',
      });

      expect(
        await pendientesService.tieneFinalizacionPendiente(
          '50100-111-Z101'
        )
      ).toBe(true);

      expect(
        await pendientesService.tieneFinalizacionPendiente(
          '50100-111-Z102'
        )
      ).toBe(false);
    });

  });


  // =====================================================
  // ROBUSTEZ
  // =====================================================

  describe('lectura corrupta', () => {

    test('no rompe si el JSON está corrupto', async () => {
      mockArchivos[ARCHIVO] = '{ esto no es json';

      expect(await pendientesService.listar()).toEqual([]);
    });

    test('no rompe si el JSON no tiene operaciones', async () => {
      mockArchivos[ARCHIVO] = JSON.stringify({
        version: 1,
      });

      expect(await pendientesService.listar()).toEqual([]);
    });

  });


  // =====================================================
  // MATRÍCULA (C3)
  // =====================================================

  describe('matrícula', () => {

    test('se guarda con la operación', async () => {

      const op = await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A-1-Z1',
        articulo: '123456',
        cantidad: 5,
        matricula: '1234',
      });

      expect(op.matricula).toBe('1234');
      expect(colaEnDisco().operaciones[0].matricula).toBe('1234');
    });

    test('sin matrícula queda null, no undefined', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A-1-Z1',
        articulo: '123456',
        cantidad: 5,
      });

      expect(colaEnDisco().operaciones[0].matricula).toBeNull();
    });

    test('la fusión se queda con la última matrícula', async () => {

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 5, matricula: '1111',
      });

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 7, matricula: '2222',
      });

      const [op] = colaEnDisco().operaciones;

      expect(op.cantidad).toBe(7);
      expect(op.matricula).toBe('2222');
    });

    test('la fusión conserva la matrícula si la nueva no trae', async () => {

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 5, matricula: '1111',
      });

      await pendientesService.encolar({
        tipo: 'actualizar', ubicacion: 'A-1-Z1', articulo: '1',
        cantidad: 7,
      });

      expect(colaEnDisco().operaciones[0].matricula).toBe('1111');
    });

    test('llega a Supabase al sincronizar (cola real + syncService)', async () => {

      await pendientesService.encolar({
        tipo: 'guardar',
        ubicacion: 'A-1-Z1',
        articulo: '123456',
        cantidad: 5,
        matricula: '1234',
      });

      const resumen = await syncService.sincronizar();

      expect(DataProvider.guardarMovimiento).toHaveBeenCalledWith({
        ubicacion: 'A-1-Z1',
        articulo: '123456',
        cantidad: 5,
        matricula: '1234',
      });

      expect(resumen.aplicadas).toBe(1);
      expect(colaEnDisco().operaciones).toHaveLength(0);
    });

  });


  // =====================================================
  // PERSISTENCIA SEGURA (C4)
  // =====================================================

  describe('persistencia segura', () => {

    const ficherosCuarentena = () =>
      Object.keys(mockArchivos).filter((p) =>
        p.startsWith('file:///test/pending-operations.corrupt-')
      );

    test('escribe de forma atómica (.tmp + renombrado)', async () => {

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        `${ARCHIVO}.tmp`,
        expect.any(String)
      );

      expect(FileSystem.moveAsync).toHaveBeenCalledWith({
        from: `${ARCHIVO}.tmp`,
        to: ARCHIVO,
      });

      expect(mockArchivos[`${ARCHIVO}.tmp`]).toBeUndefined();
    });

    test('una cola corrupta se aparta en vez de perderse', async () => {

      mockArchivos[ARCHIVO] = '{"version":1,"operaciones":[{"op';

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
      });

      const apartados = ficherosCuarentena();

      expect(apartados).toHaveLength(1);
      expect(mockArchivos[apartados[0]])
        .toBe('{"version":1,"operaciones":[{"op');

      /* La cola nueva sigue funcionando */
      expect(colaEnDisco().operaciones).toHaveLength(1);
    });

    test('si no se puede apartar, no se escribe encima', async () => {

      mockArchivos[ARCHIVO] = '{ roto';

      FileSystem.moveAsync.mockImplementationOnce(async () => {
        throw new Error('disco lleno');
      });

      await expect(
        pendientesService.encolar({
          tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
        })
      ).rejects.toThrow('disco lleno');

      expect(mockArchivos[ARCHIVO]).toBe('{ roto');
    });

    test('escrituras simultáneas no se pisan', async () => {

      const a = await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
      });

      /* La sincronización quita `a` mientras el operario encola
         otras dos: sin serializar, `quitar` reescribiría la cola
         leída antes y perdería alguna. */

      await Promise.all([
        pendientesService.quitar(a.operation_id),
        pendientesService.encolar({
          tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '2', cantidad: 2,
        }),
        pendientesService.encolar({
          tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '3', cantidad: 3,
        }),
      ]);

      const articulos = colaEnDisco().operaciones.map((op) => op.articulo);

      expect(articulos).toEqual(['2', '3']);
    });

    test('un fallo de escritura no bloquea las siguientes', async () => {

      FileSystem.writeAsStringAsync.mockImplementationOnce(async () => {
        throw new Error('fallo puntual');
      });

      await expect(
        pendientesService.encolar({
          tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
        })
      ).rejects.toThrow('fallo puntual');

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '2', cantidad: 2,
      });

      expect(colaEnDisco().operaciones).toHaveLength(1);
    });

    test('vaciar deja una cola válida', async () => {

      await pendientesService.encolar({
        tipo: 'guardar', ubicacion: 'A-1-Z1', articulo: '1', cantidad: 1,
      });

      await pendientesService.vaciar();

      expect(colaEnDisco()).toEqual({ version: 1, operaciones: [] });
      expect(ficherosCuarentena()).toHaveLength(0);
    });

  });

});
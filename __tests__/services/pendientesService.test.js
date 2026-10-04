import pendientesService from '../../src/services/pendientesService';
import * as FileSystem from 'expo-file-system/legacy';

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
      expect(op.tipo).toBe('actualizar');
      expect(op.cantidad).toBe(9);
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

});
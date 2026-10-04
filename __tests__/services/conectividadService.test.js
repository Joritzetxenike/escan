import conectividadService from '../../src/services/conectividadService';
import DataProvider from '../../src/providers/DataProvider';
import pendientesService from '../../src/services/pendientesService';
import syncService from '../../src/services/syncService';

jest.mock('../../src/providers/DataProvider', () => ({
  estaDisponible: jest.fn(),
}));

jest.mock('../../src/services/pendientesService', () => ({
  contar: jest.fn(),
}));

jest.mock('../../src/services/syncService', () => ({
  sincronizar: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

const ERROR_RED = new TypeError(
  'Network request failed'
);

describe('conectividadService', () => {

  beforeEach(async () => {
    jest.useFakeTimers();

    pendientesService.contar.mockResolvedValue(0);

    syncService.sincronizar.mockResolvedValue({
      aplicadas: 0,
      fallidas: 0,
      errores: [],
      redCaida: false,
    });

    DataProvider.estaDisponible.mockResolvedValue(
      true
    );

    /* Estado limpio antes de cada prueba */
    conectividadService.marcarSinConexion();
    conectividadService.marcarConexion();

    jest.clearAllMocks();

    pendientesService.contar.mockResolvedValue(0);

    syncService.sincronizar.mockResolvedValue({
      aplicadas: 0,
      fallidas: 0,
      errores: [],
      redCaida: false,
    });

    DataProvider.estaDisponible.mockResolvedValue(
      true
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });


  // =====================================================
  // COMPROBAR
  // =====================================================

  describe('comprobar', () => {

    test('marca online si la sonda responde', async () => {

      await conectividadService.comprobar();

      expect(
        DataProvider.estaDisponible
      ).toHaveBeenCalled();

      expect(
        conectividadService.obtenerEstado().online
      ).toBe(true);
    });

    test('marca sin conexión si la sonda falla', async () => {

      DataProvider.estaDisponible.mockResolvedValue(
        false
      );

      await conectividadService.comprobar();

      expect(
        conectividadService.obtenerEstado().online
      ).toBe(false);
    });

    test('marca sin conexión si la sonda lanza', async () => {

      DataProvider.estaDisponible.mockRejectedValue(
        ERROR_RED
      );

      await conectividadService.comprobar();

      expect(
        conectividadService.obtenerEstado().online
      ).toBe(false);
    });

  });


  // =====================================================
  // RECUPERACIÓN
  // =====================================================

  describe('recuperación de conexión', () => {

    test('sincroniza al recuperar la conexión', async () => {

      DataProvider.estaDisponible.mockResolvedValue(
        false
      );

      await conectividadService.comprobar();

      expect(syncService.sincronizar).not.toHaveBeenCalled();

      DataProvider.estaDisponible.mockResolvedValue(
        true
      );

      await conectividadService.comprobar();

      expect(syncService.sincronizar).toHaveBeenCalledTimes(1);
      expect(
        conectividadService.obtenerEstado().online
      ).toBe(true);
    });

    test('no sincroniza si nunca se perdió la conexión', async () => {

      await conectividadService.comprobar();

      expect(syncService.sincronizar).not.toHaveBeenCalled();
    });

    test('reintenta cada 30 s mientras no hay conexión', async () => {

      DataProvider.estaDisponible.mockResolvedValue(
        false
      );

      await conectividadService.comprobar();

      expect(
        DataProvider.estaDisponible
      ).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(
        conectividadService.INTERVALO_REINTENTO_MS
      );

      expect(
        DataProvider.estaDisponible
      ).toHaveBeenCalledTimes(2);

      /* Al recuperar la conexión deja de reintentar */
      DataProvider.estaDisponible.mockResolvedValue(
        true
      );

      await jest.advanceTimersByTimeAsync(
        conectividadService.INTERVALO_REINTENTO_MS
      );

      expect(
        DataProvider.estaDisponible
      ).toHaveBeenCalledTimes(3);

      await jest.advanceTimersByTimeAsync(
        conectividadService.INTERVALO_REINTENTO_MS
      );

      expect(
        DataProvider.estaDisponible
      ).toHaveBeenCalledTimes(3);
    });

  });


  // =====================================================
  // ESTADO
  // =====================================================

  describe('estado', () => {

    test('refresca el número de pendientes', async () => {

      pendientesService.contar.mockResolvedValue(3);

      await conectividadService.marcarSinConexion();

      expect(
        conectividadService.obtenerEstado().pendientes
      ).toBe(3);
    });

    test('avisa a los suscriptores', async () => {

      pendientesService.contar.mockResolvedValue(2);

      const estados = [];

      const cancelar =
        conectividadService.suscribir((estado) =>
          estados.push(estado)
        );

      await conectividadService.marcarSinConexion();

      expect(estados.length).toBeGreaterThan(1);

      expect(estados.at(-1).pendientes).toBe(2);

      cancelar();

      const total = estados.length;

      await conectividadService.marcarSinConexion();

      expect(estados).toHaveLength(total);
    });

    test('guarda el último error de red', () => {

      conectividadService.marcarSinConexion(ERROR_RED);

      expect(
        conectividadService.obtenerEstado().ultimoError
      ).toEqual({
        mensaje: 'Network request failed',
      });
    });

  });


  // =====================================================
  // SINCRONIZACIÓN MANUAL
  // =====================================================

  describe('sincronizar', () => {

    test('propaga los errores de validación al estado', async () => {

      syncService.sincronizar.mockResolvedValue({
        aplicadas: 0,
        fallidas: 1,
        errores: [
          {
            operation_id: 'op-1',
            mensaje: 'El código 123 no existe',
          },
        ],
        redCaida: false,
      });

      await conectividadService.sincronizar();

      expect(
        conectividadService.obtenerEstado().ultimoError
      ).toEqual({
        mensaje: 'El código 123 no existe',
        operation_id: 'op-1',
      });
    });

    test('limpia el error si todo se aplicó bien', async () => {

      conectividadService.marcarSinConexion(
        ERROR_RED
      );

      await conectividadService.sincronizar();

      expect(
        conectividadService.obtenerEstado().ultimoError
      ).toBeNull();
    });

    test('vuelve a sin conexión si se cae la red al enviar', async () => {

      syncService.sincronizar.mockResolvedValue({
        aplicadas: 1,
        fallidas: 0,
        errores: [],
        redCaida: true,
      });

      await conectividadService.sincronizar();

      expect(
        conectividadService.obtenerEstado().online
      ).toBe(false);
    });

    test('no sincroniza dos veces a la vez', async () => {

      let resolver;

      syncService.sincronizar.mockImplementation(
        () =>
          new Promise((r) => {
            resolver = r;
          })
      );

      const primera = conectividadService.sincronizar();
      const segunda = await conectividadService.sincronizar();

      expect(segunda).toBeNull();

      resolver({ aplicadas: 0, fallidas: 0, errores: [] });

      await primera;
    });

  });

});
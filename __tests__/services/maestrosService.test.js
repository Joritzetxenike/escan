/* =======================================================
 * COPIA LOCAL DE LOS MAESTROS
 * ======================================================= */

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
  /* El renombrado copia y borra el origen */
  moveAsync: jest.fn(async ({ from, to }) => {
    mockArchivos[to] = mockArchivos[from];
    delete mockArchivos[from];
  }),
  deleteAsync: jest.fn(async (path) => {
    delete mockArchivos[path];
  }),
}));

jest.mock('../../src/providers/DataProvider', () => ({
  obtenerEstadoUbicaciones: jest.fn(),
  obtenerMaestroArticulos: jest.fn(),
}));

jest.mock('../../src/services/conectividadService', () => ({
  estaOnline: jest.fn(),
  marcarConexion: jest.fn(),
  marcarSinConexion: jest.fn(),
  suscribir: jest.fn(() => () => {}),
}));

/* ---------- Rutas ---------- */

const ARTICULOS =
  'file:///test/maestro-articulos.json';

const UBICACIONES =
  'file:///test/maestro-ubicaciones.json';

const META = 'file:///test/maestros-meta.json';

/* ---------- Datos de prueba ---------- */

const ARBOL = [
  {
    seccion: 'LIN2',
    maestroArea: [
      {
        area: 'A01',
        maestroUbicacion: [
          { subzona: 'Z01' },
          { subzona: 'Z02' },
        ],
      },
    ],
  },
];

const MAESTRO = {
  codigos: ['123456', '789012'],
  sic: ['789012'],
};

const escribirArticulos = (actualizadoAt) => {
  mockArchivos[ARTICULOS] = JSON.stringify({
    version: 1,
    actualizado_at: actualizadoAt,
    total: 2,
    codigos: MAESTRO.codigos,
    sic: MAESTRO.sic,
  });
};

const escribirUbicaciones = () => {
  mockArchivos[UBICACIONES] = JSON.stringify({
    version: 1,
    actualizado_at: new Date().toISOString(),
    ubicaciones: ['LIN2-A01-Z01', 'LIN2-A01-Z02'],
  });
};

const haceHoras = (horas) =>
  new Date(Date.now() - horas * 3600 * 1000).toISOString();

/* ---------- Mocks ---------- */

let maestrosService;
let DataProvider;
let conectividadService;
let FileSystem;

describe('maestrosService', () => {

  beforeEach(() => {
    /* El servicio es un singleton con caché en memoria: hay
       que recargarlo en cada test. */
    jest.resetModules();
    jest.clearAllMocks();

    Object.keys(mockArchivos).forEach(
      (key) => delete mockArchivos[key]
    );

    DataProvider =
      require('../../src/providers/DataProvider');

    conectividadService =
      require('../../src/services/conectividadService');

    FileSystem = require('expo-file-system/legacy');

    maestrosService =
      require('../../src/services/maestrosService').default;

    conectividadService.estaOnline.mockResolvedValue(true);

    DataProvider.obtenerEstadoUbicaciones
      .mockResolvedValue(ARBOL);

    DataProvider.obtenerMaestroArticulos
      .mockResolvedValue(MAESTRO);
  });


  // =====================================================
  // CONSULTA
  // =====================================================

  describe('sin copia en disco', () => {

    test('no dice nada si no se ha cargado', () => {
      expect(
        maestrosService.existeArticulo('123456')
      ).toBeNull();

      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBeNull();
    });

  });

  describe('tras cargar la copia', () => {

    beforeEach(async () => {
      escribirArticulos(new Date().toISOString());
      escribirUbicaciones();

      await maestrosService.asegurarListo();
    });

    test('reconoce los artículos de la copia', () => {
      expect(
        maestrosService.existeArticulo('123456')
      ).toBe(true);

      expect(
        maestrosService.existeArticulo('000000')
      ).toBe(false);
    });

    test('distingue los SIC', () => {
      expect(maestrosService.esSIC('789012')).toBe(true);
      expect(maestrosService.esSIC('123456')).toBe(false);
      expect(maestrosService.esSIC('000000')).toBe(false);
    });

    test('reconoce las ubicaciones de la copia', () => {
      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBe(true);

      expect(
        maestrosService.existeUbicacion('99999-999-Z999')
      ).toBe(false);
    });

    test('marca la copia como disponible', () => {
      expect(
        maestrosService.obtenerEstado().hayCopia
      ).toBe(true);
    });

    test('no vuelve a pedir la copia a Supabase', async () => {
      await maestrosService.asegurarListo();

      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();
    });

  });


  // =====================================================
  // DESCARGA
  // =====================================================

  describe('descargar', () => {

    test('guarda ambos ficheros y aparta la copia', async () => {

      const ok = await maestrosService.descargar();

      expect(ok).toBe(true);

      const articulos = JSON.parse(mockArchivos[ARTICULOS]);
      const ubicaciones = JSON.parse(
        mockArchivos[UBICACIONES]
      );

      expect(articulos.codigos).toEqual(MAESTRO.codigos);
      expect(articulos.sic).toEqual(MAESTRO.sic);
      expect(articulos.total).toBe(2);

      /* El árbol se aplana a códigos seccion-area-subzona */
      expect(ubicaciones.ubicaciones).toEqual([
        'LIN2-A01-Z01',
        'LIN2-A01-Z02',
      ]);

      expect(
        maestrosService.existeArticulo('123456')
      ).toBe(true);

      expect(
        maestrosService.esSIC('789012')
      ).toBe(true);
    });

    test('escribe de forma atómica (tmp + renombrado)', async () => {

      await maestrosService.descargar();

      const escritos = FileSystem.writeAsStringAsync
        .mock.calls.map(([path]) => path);

      /* Nunca se escribe en el destino final */
      expect(escritos).not.toContain(ARTICULOS);
      expect(escritos).not.toContain(UBICACIONES);

      expect(escritos).toContain(`${ARTICULOS}.tmp`);
      expect(escritos).toContain(`${UBICACIONES}.tmp`);

      const movidos = FileSystem.moveAsync.mock.calls
        .map(([{ from, to }]) => to);

      expect(movidos).toContain(ARTICULOS);
      expect(movidos).toContain(UBICACIONES);
    });

    test('avisa a la conectividad de que hay red', async () => {

      await maestrosService.descargar();

      expect(
        conectividadService.marcarConexion
      ).toHaveBeenCalled();
    });

    test('no hace nada si ya se está descargando', async () => {

      const primera = maestrosService.descargar();

      const segunda = await maestrosService.descargar();

      await primera;

      /* La segunda llamada no vuelve a pedir el maestro */
      expect(segunda).toBe(false);

      expect(
        DataProvider.obtenerMaestroArticulos
      ).toHaveBeenCalledTimes(1);
    });

  });


  // =====================================================
  // PRIMERA COPIA: ES OBLIGATORIA
  // =====================================================

  describe('sin copia previa', () => {

    test('asegurarListo la descarga si hay red', async () => {
      const listo = await maestrosService.asegurarListo();

      expect(listo).toBe(true);

      expect(
        DataProvider.obtenerMaestroArticulos
      ).toHaveBeenCalled();
    });

    test('sin red no puede validar', async () => {
      conectividadService.estaOnline.mockResolvedValue(false);

      const listo = await maestrosService.asegurarListo();

      expect(listo).toBe(false);

      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();

      expect(
        maestrosService.obtenerEstado().error
      ).toBe(maestrosService.SIN_CONEXION);
    });

    test('el aviso es obligatorio: no se puede aplazar', async () => {
      await maestrosService.asegurarListo();

      const estado = maestrosService.obtenerEstado();

      /* Ya se descargó, así que no pide nada */
      expect(estado.pideActualizar).toBe(false);
      expect(estado.hayCopia).toBe(true);
    });

  });


  // =====================================================
  // REFRESCO: LO DECIDE EL OPERARIO
  // =====================================================

  describe('refresco de una copia existente', () => {

    test('una copia al día no molesta', async () => {
      escribirArticulos(new Date().toISOString());
      escribirUbicaciones();

      await maestrosService.evaluarRefresco();

      const estado = maestrosService.obtenerEstado();

      expect(estado.pideActualizar).toBe(false);

      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();
    });

    test('una copia vieja NO se descarga sola: solo avisa', async () => {
      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();
      await maestrosService.evaluarRefresco();

      expect(
        maestrosService.obtenerEstado().pideActualizar
      ).toBe(true);

      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();
    });

    test('tras "ahora no" no se vuelve a preguntar en 12 h', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      await maestrosService.rechazarRefresco();

      const estado = maestrosService.obtenerEstado();

      expect(estado.pideActualizar).toBe(false);

      /* El aplazamiento queda en disco, así que tampoco se
         pregunta en el siguiente arranque */
      expect(
        JSON.parse(mockArchivos[META]).rechazada_hasta
      ).toEqual(expect.any(String));

      await maestrosService.evaluarRefresco();

      expect(
        maestrosService.obtenerEstado().pideActualizar
      ).toBe(false);
    });

    test('pasadas 12 h vuelve a preguntar', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();
      await maestrosService.rechazarRefresco();

      /* Se adelanta el reloj: el aplazamiento ya venció */
      mockArchivos[META] = JSON.stringify({
        rechazada_hasta: new Date(
          Date.now() - 1000
        ).toISOString(),
      });

      await maestrosService.evaluarRefresco();

      expect(
        maestrosService.obtenerEstado().pideActualizar
      ).toBe(true);
    });

    test('el botón de actualizar sí descarga contra la opinion', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();
      await maestrosService.rechazarRefresco();

      const ok = await maestrosService.descargar();

      expect(ok).toBe(true);

      const estado = maestrosService.obtenerEstado();

      expect(estado.pideActualizar).toBe(false);
      expect(estado.rechazadaHasta).toBeNull();
    });

  });


  // =====================================================
  // ANTIGÜEDAD
  // =====================================================

  describe('antigüedad', () => {

    test('una copia de 30 h se considera vieja', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      expect(
        maestrosService.estaViejo()
      ).toBe(true);

      expect(
        maestrosService.antiguedadHoras()
      ).toBeGreaterThan(29);
    });

    test('una copia de 1 h no se considera vieja', async () => {

      escribirArticulos(haceHoras(1));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      expect(maestrosService.estaViejo()).toBe(false);
    });

    test('sin copia se considera vieja', () => {
      expect(maestrosService.estaViejo()).toBe(true);
    });

  });


  // =====================================================
  // ROBUSTEZ
  // =====================================================

  describe('fallos y corrupciones', () => {

    test('un fallo de descarga conserva la copia anterior', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      DataProvider.obtenerMaestroArticulos
        .mockRejectedValue(new Error('boom'));

      const ok = await maestrosService.descargar();

      /* Sigue pudiendo validar con la copia buena */
      expect(ok).toBe(true);

      expect(
        maestrosService.existeArticulo('123456')
      ).toBe(true);

      expect(
        maestrosService.obtenerEstado().error
      ).toBe('boom');
    });

    test('un fallo de red marca la app como sin conexión', async () => {

      DataProvider.obtenerMaestroArticulos
        .mockRejectedValue(
          new TypeError('Network request failed')
        );

      await maestrosService.descargar();

      expect(
        conectividadService.marcarSinConexion
      ).toHaveBeenCalled();
    });

    test('un maestro corrupto se reconstruye descargando', async () => {

      mockArchivos[ARTICULOS] = '{ esto no es json';

      const listo = await maestrosService.asegurarListo();

      expect(listo).toBe(true);

      expect(
        maestrosService.existeArticulo('123456')
      ).toBe(true);
    });

    test('si falta el fichero de ubicaciones, lo recupera solo', async () => {

      /* Artículos en buen estado, ubicaciones sin leer: la app
         se autorrepara bajando solo las 199 ubicaciones, sin
         obligar a rebajar los 3 MB del maestro de artículos. */

      escribirArticulos(new Date().toISOString());

      await maestrosService.asegurarListo();

      expect(
        DataProvider.obtenerEstadoUbicaciones
      ).toHaveBeenCalled();

      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBe(true);

      /* El maestro de artículos no se volvió a bajar */
      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();

      expect(
        JSON.parse(mockArchivos[UBICACIONES]).ubicaciones
      ).toEqual(['LIN2-A01-Z01', 'LIN2-A01-Z02']);
    });

    test('si la reparación de ubicaciones falla, lo dice', async () => {

      escribirArticulos(new Date().toISOString());

      DataProvider.obtenerEstadoUbicaciones
        .mockRejectedValue(new Error('boom'));

      await maestrosService.asegurarListo();

      /* Sin copia de ubicaciones no se sabe si el código
         existe: `null`, que el validador interpreta como
         "falta la copia" */
      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBeNull();

      expect(
        maestrosService.obtenerEstado().error
      ).toBe('boom');
    });

    test('descargarUbicaciones solo baja el árbol de ubicaciones', async () => {

      const codigos = await maestrosService
        .descargarUbicaciones();

      expect(codigos.has('LIN2-A01-Z01')).toBe(true);
      expect(codigos.has('CARR-A14-Z07')).toBe(false);

      expect(
        DataProvider.obtenerEstadoUbicaciones
      ).toHaveBeenCalled();

      /* No toca el maestro de artículos */
      expect(
        DataProvider.obtenerMaestroArticulos
      ).not.toHaveBeenCalled();

      expect(
        maestrosService.obtenerEstado().descargando
      ).toBe(false);
    });

    test('descargarUbicaciones con el árbol vacío no escribe', async () => {

      escribirArticulos(new Date().toISOString());
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      DataProvider.obtenerEstadoUbicaciones
        .mockResolvedValue([]);

      const codigos =
        await maestrosService.descargarUbicaciones();

      expect(codigos).toBeNull();

      /* La copia buena sigue siendo la que se usa */
      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBe(true);

      expect(
        JSON.parse(mockArchivos[UBICACIONES]).ubicaciones
      ).toEqual(['LIN2-A01-Z01', 'LIN2-A01-Z02']);
    });

    test('sin maestro de artículos no puede validar', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      escribirUbicaciones();

      const listo = await maestrosService.asegurarListo();

      expect(listo).toBe(false);
    });

    test('un maestro vacío no pisa la copia buena', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      /* La RPC devuelve un array vacío: es un fallo, no un
         almacén sin artículos */

      DataProvider.obtenerMaestroArticulos
        .mockResolvedValue({ codigos: [], sic: [] });

      const ok = await maestrosService.descargar();

      expect(ok).toBe(true);

      expect(
        maestrosService.existeArticulo('123456')
      ).toBe(true);

      expect(
        maestrosService.obtenerEstado().error
      ).toContain('vacía');
    });

    test('un árbol de ubicaciones vacío no se guarda', async () => {

      escribirArticulos(haceHoras(30));
      escribirUbicaciones();

      await maestrosService.asegurarListo();

      DataProvider.obtenerEstadoUbicaciones
        .mockResolvedValue([]);

      await maestrosService.descargar();

      /* La copia de ubicaciones sigue siendo la buena */

      expect(
        maestrosService.existeUbicacion('LIN2-A01-Z01')
      ).toBe(true);
    });

  });


  // =====================================================
  // SUSCRIPTORES
  // =====================================================

  describe('suscribir', () => {

    test('avisa del estado actual al suscribirse', async () => {

      const fn = jest.fn();

      maestrosService.suscribir(fn);

      expect(fn).toHaveBeenCalledWith(
        maestrosService.obtenerEstado()
      );
    });

    test('avisa de cada cambio', async () => {

      const fn = jest.fn();

      maestrosService.suscribir(fn);

      await maestrosService.descargar();

      expect(
        fn.mock.calls.some(([estado]) => estado.hayCopia)
      ).toBe(true);
    });

  });

});
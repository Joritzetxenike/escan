import {
  actualizarOperarios,
  buscarOperario,
  ARCHIVO_OPERARIOS,
} from '../../src/helpers/operariosHelper';
import DataProvider from '../../src/providers/DataProvider';

/* =====================================================
 * OPERARIOS LOCALES (A6)
 * ===================================================== */

const mockArchivos = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  getInfoAsync: jest.fn(async (path) => ({
    exists: Object.prototype.hasOwnProperty.call(mockArchivos, path),
  })),
  readAsStringAsync: jest.fn(async (path) => mockArchivos[path] ?? ''),
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

jest.mock('../../src/providers/DataProvider', () => ({
  obtenerOperarios: jest.fn(),
}));

const enDisco = () => JSON.parse(mockArchivos[ARCHIVO_OPERARIOS]);

describe('operariosHelper', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockArchivos).forEach((k) => delete mockArchivos[k]);
  });

  test('sin fichero, crea la copia desde la plantilla (vacía: sin operarios de prueba)', async () => {

    expect(await buscarOperario('00123')).toBeNull();
    expect(enDisco()).toEqual([]);
  });

  test('NO reescribe en cada login una lista válida', async () => {

    mockArchivos[ARCHIVO_OPERARIOS] = JSON.stringify([
      { matricula: '777', nombre: 'Real', activo: true },
    ]);

    expect(await buscarOperario('777')).toEqual(
      expect.objectContaining({ nombre: 'Real' })
    );

    /* Antes se pisaba con la plantilla por faltar esAdminEmergencia */
    expect(await buscarOperario('777')).not.toBeNull();
    expect(await buscarOperario('00123')).toBeNull();
  });

  test('repone la plantilla si el fichero está corrupto', async () => {

    mockArchivos[ARCHIVO_OPERARIOS] = '{ roto';

    await buscarOperario('777');

    expect(enDisco()).toEqual([]);
  });

  test('actualizarOperarios guarda la lista del servidor', async () => {

    DataProvider.obtenerOperarios.mockResolvedValue([
      { matricula: '777', nombre: 'Real', activo: true },
      { matricula: '888', nombre: 'Baja', activo: false },
    ]);

    expect(await actualizarOperarios()).toBe(true);

    expect(await buscarOperario('777')).toEqual(
      expect.objectContaining({ nombre: 'Real', activo: true })
    );
    expect(await buscarOperario('888')).toEqual(
      expect.objectContaining({ activo: false })
    );
  });

  test('una respuesta vacía no borra la copia buena', async () => {

    mockArchivos[ARCHIVO_OPERARIOS] = JSON.stringify([
      { matricula: '777', nombre: 'Real', activo: true },
    ]);

    DataProvider.obtenerOperarios.mockResolvedValue([]);

    expect(await actualizarOperarios()).toBe(false);
    expect(await buscarOperario('777')).not.toBeNull();
  });

  test('sin red no lanza y conserva la copia', async () => {

    mockArchivos[ARCHIVO_OPERARIOS] = JSON.stringify([
      { matricula: '777', nombre: 'Real', activo: true },
    ]);

    DataProvider.obtenerOperarios.mockRejectedValue(
      new TypeError('Network request failed')
    );

    expect(await actualizarOperarios()).toBe(false);
    expect(await buscarOperario('777')).not.toBeNull();
  });

  test('descarta filas sin matrícula', async () => {

    DataProvider.obtenerOperarios.mockResolvedValue([
      { matricula: '', nombre: 'Vacía', activo: true },
      { matricula: '777', nombre: 'Real', activo: true },
    ]);

    await actualizarOperarios();

    expect(enDisco()).toEqual([
      { matricula: '777', nombre: 'Real', activo: true },
    ]);
  });

});

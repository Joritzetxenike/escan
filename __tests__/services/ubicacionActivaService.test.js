import * as FileSystem from 'expo-file-system/legacy';

import ubicacionActivaService from '../../src/services/ubicacionActivaService';

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
  'file:///test/ubicacion-activa.json';

describe('ubicacionActivaService', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    Object.keys(mockArchivos).forEach(
      (key) => delete mockArchivos[key]
    );
  });

  test('no hay ubicación activa al empezar', async () => {
    await expect(
      ubicacionActivaService.obtener()
    ).resolves.toBeNull();
  });

  test('guarda el código normalizado con escritura atómica', async () => {
    const ubicacion =
      await ubicacionActivaService.guardar(' lin2-a01-z01 ');

    expect(ubicacion).toBe('LIN2-A01-Z01');

    expect(FileSystem.writeAsStringAsync)
      .toHaveBeenCalledWith(
        `${ARCHIVO}.tmp`,
        expect.any(String)
      );

    expect(FileSystem.moveAsync).toHaveBeenCalledWith({
      from: `${ARCHIVO}.tmp`,
      to: ARCHIVO,
    });

    await expect(
      ubicacionActivaService.obtener()
    ).resolves.toBe('LIN2-A01-Z01');
  });

  test('ignora un código vacío', async () => {
    await expect(
      ubicacionActivaService.guardar('   ')
    ).resolves.toBeNull();

    expect(FileSystem.writeAsStringAsync)
      .not.toHaveBeenCalled();
  });

  test('limpia solo si el código coincide', async () => {
    await ubicacionActivaService.guardar('LIN2-A01-Z01');

    await ubicacionActivaService.limpiarSiCoincide(
      'LIN2-A02-Z02'
    );

    await expect(
      ubicacionActivaService.obtener()
    ).resolves.toBe('LIN2-A01-Z01');

    await ubicacionActivaService.limpiarSiCoincide(
      'lin2-a01-z01'
    );

    await expect(
      ubicacionActivaService.obtener()
    ).resolves.toBeNull();
  });

  test('limpiar es idempotente', async () => {
    await ubicacionActivaService.limpiar();

    expect(FileSystem.deleteAsync)
      .not.toHaveBeenCalled();
  });

  test('un JSON corrupto no deja una ubicación fantasma', async () => {
    mockArchivos[ARCHIVO] = '{no es json';

    await expect(
      ubicacionActivaService.obtener()
    ).resolves.toBeNull();
  });

});

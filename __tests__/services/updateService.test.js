jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
  },
}));

import { comprobarActualizacion } from '../../src/services/updateService';

describe('UpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe detectar correctamente si existe una actualización', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v1.0.1',
        body: 'Nueva versión de Escan',
        assets: [
          {
            name: 'escan-v1.0.1.apk',
            browser_download_url:
              'https://github.com/Joritzetxenike/escan/releases/download/v1.0.1/escan-v1.0.1.apk',
          },
        ],
      }),
    });

    const resultado = await comprobarActualizacion();

    expect(resultado.hayActualizacion).toBe(true);
    expect(resultado.versionActual).toBe('1.0.0');
    expect(resultado.ultimaVersion).toBe('1.0.1');
    expect(resultado.apkUrl).toContain('.apk');
  });

  test('debe indicar que no hay actualización cuando las versiones coinciden', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v1.0.0',
        body: '',
        assets: [],
      }),
    });

    const resultado = await comprobarActualizacion();

    expect(resultado.hayActualizacion).toBe(false);
    expect(resultado.ultimaVersion).toBe('1.0.0');
    expect(resultado.apkUrl).toBeNull();
  });

  test('debe manejar errores de GitHub', async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error('Error de conexión')
    );

    const resultado = await comprobarActualizacion();

    expect(resultado.hayActualizacion).toBe(false);
    expect(resultado.error).toBe(true);
  });
  test('debe detectar 1.0.1 como más nueva que 1.0.0', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      tag_name: 'v1.0.1',
      body: '',
      assets: [],
    }),
  });

  const resultado = await comprobarActualizacion();

  expect(resultado.hayActualizacion).toBe(true);
});

test('debe detectar 1.1.0 como más nueva que 1.0.0', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      tag_name: 'v1.1.0',
      body: '',
      assets: [],
    }),
  });

  const resultado = await comprobarActualizacion();

  expect(resultado.hayActualizacion).toBe(true);
});

    test('debe detectar 2.0.0 como más nueva que 1.0.0', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
        tag_name: 'v2.0.0',
        body: '',
        assets: [],
        }),
    });

    const resultado = await comprobarActualizacion();

    expect(resultado.hayActualizacion).toBe(true);
    });

    test('no debe considerar 1.0.0 como actualización', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
        tag_name: 'v1.0.0',
        body: '',
        assets: [],
        }),
    });

    const resultado = await comprobarActualizacion();

    expect(resultado.hayActualizacion).toBe(false);
    });
});
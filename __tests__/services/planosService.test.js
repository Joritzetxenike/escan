import planosService, {
  SIN_CONEXION,
  carpetaPlanos,
  listarPlanos,
  seccionYArea,
  tipoDePlano,
  urlPlano,
} from '../../src/services/planosService';
import supabase from '../../src/providers/supabase/supabaseClient';
import conectividadService from '../../src/services/conectividadService';

const mockBucket = {
  list: jest.fn(),
  createSignedUrl: jest.fn(),
};

jest.mock('../../src/providers/supabase/supabaseClient', () => ({
  __esModule: true,
  default: { storage: { from: jest.fn(() => mockBucket) } },
}));

jest.mock('../../src/services/conectividadService', () => ({
  __esModule: true,
  default: {
    estaOnline: jest.fn(),
    marcarConexion: jest.fn(),
    marcarSinConexion: jest.fn(),
  },
}));

describe('planosService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    conectividadService.estaOnline.mockResolvedValue(true);
  });

  test('carpeta por sección y por área, sin poder salirse', () => {
    expect(carpetaPlanos('CARP')).toBe('CARP');
    expect(carpetaPlanos('LIN2', 'A01')).toBe('LIN2/A01');
    expect(() => carpetaPlanos('../x')).toThrow();
    expect(() => carpetaPlanos('LIN2', 'A01/..')).toThrow();
  });

  test('sección y área salen del código de ubicación', () => {
    expect(seccionYArea('LIN2-A01-Z01')).toEqual({ seccion: 'LIN2', area: 'A01' });
    expect(seccionYArea(null)).toEqual({ seccion: null, area: null });
  });

  test('tipo por mimetype o extensión', () => {
    expect(tipoDePlano('x', 'application/pdf')).toBe('pdf');
    expect(tipoDePlano('Captura.PNG')).toBe('imagen');
    expect(tipoDePlano('hoja.xlsx')).toBe('otro');
  });

  test('lista solo ficheros del bucket planos', async () => {
    mockBucket.list.mockResolvedValue({
      data: [
        { name: 'A01', id: null, metadata: null },
        { name: '.emptyFolderPlaceholder', id: '1', metadata: {} },
        { name: '148165.pdf', id: '2', metadata: { size: 108915, mimetype: 'application/pdf' } },
        { name: 'captura.png', id: '3', metadata: { size: 21480, mimetype: 'image/png' } },
      ],
      error: null,
    });

    const planos = await listarPlanos('CARP');

    expect(supabase.storage.from).toHaveBeenCalledWith('planos');
    expect(mockBucket.list).toHaveBeenCalledWith('CARP', expect.objectContaining({ limit: 200 }));
    expect(planos).toEqual([
      { nombre: '148165.pdf', ruta: 'CARP/148165.pdf', tipo: 'pdf', bytes: 108915 },
      { nombre: 'captura.png', ruta: 'CARP/captura.png', tipo: 'imagen', bytes: 21480 },
    ]);
    expect(conectividadService.marcarConexion).toHaveBeenCalled();
  });

  test('URL firmada de 1 hora', async () => {
    mockBucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/firmada' }, error: null });

    expect(await urlPlano('CARP/148165.pdf')).toBe('https://x/firmada');
    expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('CARP/148165.pdf', 3600);
  });

  test('sin conexión no pide nada y avisa', async () => {
    conectividadService.estaOnline.mockResolvedValue(false);

    await expect(listarPlanos('CARP')).rejects.toThrow(SIN_CONEXION);
    await expect(urlPlano('CARP/a.pdf')).rejects.toThrow(SIN_CONEXION);
    expect(mockBucket.list).not.toHaveBeenCalled();
    expect(mockBucket.createSignedUrl).not.toHaveBeenCalled();
  });

  test('un fallo de red marca la app sin conexión', async () => {
    mockBucket.list.mockRejectedValue(new TypeError('Network request failed'));

    await expect(listarPlanos('CARP')).rejects.toThrow(SIN_CONEXION);
    expect(conectividadService.marcarSinConexion).toHaveBeenCalled();
  });

  test('un error que no es de red se propaga tal cual', async () => {
    mockBucket.list.mockResolvedValue({ data: null, error: new Error('Bucket not found') });

    await expect(listarPlanos('CARP')).rejects.toThrow('Bucket not found');
    expect(conectividadService.marcarSinConexion).not.toHaveBeenCalled();
  });

  test('export por defecto expone las funciones', () => {
    expect(planosService.listarPlanos).toBe(listarPlanos);
    expect(planosService.urlPlano).toBe(urlPlano);
  });

});

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getSupabase } from '../lib/supabase';
import {
  borrarPlano,
  carpetaPlanos,
  limpiarNombre,
  listarPlanos,
  subirPlano,
  tipoDePlano,
  urlPlano,
} from './planosApi';

vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

describe('planosApi', () => {
  let bucket;

  beforeEach(() => {
    bucket = {
      list: vi.fn(),
      createSignedUrl: vi.fn(),
      upload: vi.fn(),
      remove: vi.fn(),
    };
    getSupabase.mockReturnValue({
      storage: { from: vi.fn(() => bucket) },
    });
  });

  test('carpeta por sección y por área, sin permitir salirse', () => {
    expect(carpetaPlanos('LIN2')).toBe('LIN2');
    expect(carpetaPlanos('LIN2', 'A01')).toBe('LIN2/A01');
    expect(() => carpetaPlanos('../otro')).toThrow();
    expect(() => carpetaPlanos('LIN2', 'A01/../x')).toThrow();
  });

  test('deduce el tipo por mimetype o por extensión', () => {
    expect(tipoDePlano('x.bin', 'application/pdf')).toBe('pdf');
    expect(tipoDePlano('Plano.PDF')).toBe('pdf');
    expect(tipoDePlano('foto.jpeg')).toBe('imagen');
    expect(tipoDePlano('hoja.xlsx')).toBe('otro');
  });

  test('limpia el nombre: sin tildes y sin caracteres raros', () => {
    expect(limpiarNombre('Plano sección Ñ #1.pdf')).toBe('Plano seccion N _1.pdf');
    expect(limpiarNombre('  ..oculto.png ')).toBe('oculto.png');
  });

  test('lista solo ficheros, sin subcarpetas ni el marcador de carpeta vacía', async () => {
    bucket.list.mockResolvedValue({
      data: [
        { name: 'A01', id: null, metadata: null },
        { name: '.emptyFolderPlaceholder', id: '1', metadata: {} },
        {
          name: 'general.pdf',
          id: '2',
          updated_at: '2026-11-18T10:00:00Z',
          metadata: { size: 2048, mimetype: 'application/pdf' },
        },
        { name: 'estanterias.png', id: '3', metadata: { size: 10, mimetype: 'image/png' } },
      ],
      error: null,
    });

    const planos = await listarPlanos('LIN2');

    expect(bucket.list).toHaveBeenCalledWith('LIN2', expect.objectContaining({ limit: 200 }));
    expect(planos).toEqual([
      {
        nombre: 'general.pdf',
        ruta: 'LIN2/general.pdf',
        tipo: 'pdf',
        bytes: 2048,
        actualizado: '2026-11-18T10:00:00Z',
      },
      {
        nombre: 'estanterias.png',
        ruta: 'LIN2/estanterias.png',
        tipo: 'imagen',
        bytes: 10,
        actualizado: null,
      },
    ]);
  });

  test('propaga el error al listar', async () => {
    bucket.list.mockResolvedValue({ data: null, error: new Error('sin permiso') });
    await expect(listarPlanos('LIN2')).rejects.toThrow('sin permiso');
  });

  test('URL firmada para ver y para descargar', async () => {
    bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/firmada' }, error: null });

    expect(await urlPlano('LIN2/general.pdf')).toBe('https://x/firmada');
    expect(bucket.createSignedUrl).toHaveBeenLastCalledWith('LIN2/general.pdf', 3600, undefined);

    await urlPlano('LIN2/general.pdf', { descargar: true });
    expect(bucket.createSignedUrl).toHaveBeenLastCalledWith('LIN2/general.pdf', 3600, {
      download: 'general.pdf',
    });
  });

  test('sube a la carpeta del área con el nombre limpio', async () => {
    bucket.upload.mockResolvedValue({ data: {}, error: null });
    const fichero = { name: 'Detalle área.jpg', type: 'image/jpeg', size: 1000 };

    const res = await subirPlano({ seccion: 'LIN2', area: 'A01', fichero });

    expect(res).toEqual({ ruta: 'LIN2/A01/Detalle area.jpg', nombre: 'Detalle area.jpg' });
    expect(bucket.upload).toHaveBeenCalledWith('LIN2/A01/Detalle area.jpg', fichero, {
      upsert: false,
      contentType: 'image/jpeg',
      cacheControl: '60',
    });
  });

  test('un nombre repetido devuelve un error marcado como duplicado', async () => {
    bucket.upload.mockResolvedValue({
      data: null,
      error: { statusCode: '409', message: 'The resource already exists' },
    });

    await expect(
      subirPlano({ seccion: 'LIN2', fichero: { name: 'a.pdf', type: 'application/pdf', size: 1 } }),
    ).rejects.toMatchObject({ duplicado: true });
  });

  test('sobrescribir usa upsert', async () => {
    bucket.upload.mockResolvedValue({ data: {}, error: null });

    await subirPlano({
      seccion: 'LIN2',
      fichero: { name: 'a.pdf', type: 'application/pdf', size: 1 },
      sobrescribir: true,
    });

    expect(bucket.upload.mock.calls[0][2].upsert).toBe(true);
  });

  test('rechaza formatos no admitidos y ficheros de más de 50 MB', async () => {
    await expect(
      subirPlano({ seccion: 'LIN2', fichero: { name: 'a.xlsx', type: 'application/vnd.ms-excel', size: 1 } }),
    ).rejects.toThrow('Formato no admitido');

    await expect(
      subirPlano({ seccion: 'LIN2', fichero: { name: 'a.pdf', type: 'application/pdf', size: 60 * 1024 * 1024 } }),
    ).rejects.toThrow('50 MB');

    expect(bucket.upload).not.toHaveBeenCalled();
  });

  test('borra por ruta', async () => {
    bucket.remove.mockResolvedValue({ data: [], error: null });
    await borrarPlano('LIN2/a.pdf');
    expect(bucket.remove).toHaveBeenCalledWith(['LIN2/a.pdf']);
  });
});

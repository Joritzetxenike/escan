import { getSupabase } from '../lib/supabase';

/* =======================================================
 * PLANOS (Supabase Storage, bucket privado `planos`)
 * =======================================================
 *
 * Una carpeta por sección y, opcional, una subcarpeta por área:
 *
 *   LIN2/plano general.pdf
 *   LIN2/A01/detalle.jpg
 *
 * Ver supabase/migrations/20261118000200_planos_storage.sql.
 * Solo los administradores pueden listar, ver, subir y borrar.
 * ======================================================= */

export const BUCKET = 'planos';

export const MAX_BYTES = 50 * 1024 * 1024;

/* Lo que el navegador muestra sin plugins */
export const TIPOS_PERMITIDOS = {
  'application/pdf': 'pdf',
  'image/png': 'imagen',
  'image/jpeg': 'imagen',
  'image/webp': 'imagen',
};

const EXTENSIONES = {
  pdf: 'pdf',
  png: 'imagen',
  jpg: 'imagen',
  jpeg: 'imagen',
  webp: 'imagen',
};

/* Las URLs firmadas caducan: si alguien copia el enlace, deja
   de funcionar. Una hora da para consultar con calma. */
const SEGUNDOS_URL = 60 * 60;

/* Supabase solo los usa como carpeta: se comprueba que no traen
   barras ni caracteres que permitan salirse de la carpeta. */
const SEGMENTO_VALIDO = /^[A-Za-z0-9._-]+$/;

export function carpetaPlanos(seccion, area) {
  if (!seccion || !SEGMENTO_VALIDO.test(seccion)) {
    throw new Error(`Sección no válida: ${seccion}`);
  }
  if (area == null || area === '') {
    return seccion;
  }
  if (!SEGMENTO_VALIDO.test(area)) {
    throw new Error(`Área no válida: ${area}`);
  }
  return `${seccion}/${area}`;
}

export function tipoDePlano(nombre, mimetype) {
  if (mimetype && TIPOS_PERMITIDOS[mimetype]) {
    return TIPOS_PERMITIDOS[mimetype];
  }
  const extension = String(nombre).split('.').pop()?.toLowerCase();
  return EXTENSIONES[extension] ?? 'otro';
}

/**
 * Nombre seguro para Storage, que rechaza tildes y algunos
 * símbolos en las claves: sin tildes (criterio del proyecto),
 * espacios conservados y el resto de caracteres raros → `_`.
 */
export function limpiarNombre(nombre) {
  const limpio = String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ._()-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return limpio.replace(/^\.+/, '') || 'plano';
}

/**
 * Ficheros de una carpeta (sin subcarpetas ni el marcador que
 * crea Supabase en carpetas vacías), ordenados por nombre.
 */
export async function listarPlanos(seccion, area) {
  const carpeta = carpetaPlanos(seccion, area);
  const client = getSupabase();

  const { data, error } = await client.storage
    .from(BUCKET)
    .list(carpeta, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((item) => item.id !== null && !item.name.startsWith('.'))
    .map((item) => ({
      nombre: item.name,
      ruta: `${carpeta}/${item.name}`,
      tipo: tipoDePlano(item.name, item.metadata?.mimetype),
      bytes: item.metadata?.size ?? null,
      actualizado: item.updated_at ?? null,
    }));
}

/** URL temporal para ver (o descargar) un plano. */
export async function urlPlano(ruta, { descargar = false } = {}) {
  const client = getSupabase();
  const nombre = ruta.split('/').pop();

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(
      ruta,
      SEGUNDOS_URL,
      descargar ? { download: nombre } : undefined,
    );

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

const esDuplicado = (error) =>
  String(error?.statusCode) === '409' ||
  /exists|duplicate/i.test(error?.message ?? '');

/**
 * Sube un plano. Si ya existe uno con el mismo nombre y no se
 * pide `sobrescribir`, lanza un error con `duplicado = true`
 * para que la pantalla pregunte.
 */
export async function subirPlano({ seccion, area, fichero, sobrescribir = false }) {
  if (!fichero) {
    throw new Error('Elige un fichero');
  }

  if (tipoDePlano(fichero.name, fichero.type) === 'otro') {
    throw new Error('Formato no admitido: solo PDF, PNG, JPG o WEBP');
  }

  if (fichero.size > MAX_BYTES) {
    throw new Error('El fichero supera los 50 MB');
  }

  const carpeta = carpetaPlanos(seccion, area);
  const nombre = limpiarNombre(fichero.name);
  const ruta = `${carpeta}/${nombre}`;

  const client = getSupabase();

  const { error } = await client.storage.from(BUCKET).upload(ruta, fichero, {
    upsert: sobrescribir,
    contentType: fichero.type || undefined,
    /* Al sustituir un plano, que no se quede el anterior en
       caché más de un minuto. */
    cacheControl: '60',
  });

  if (error) {
    if (esDuplicado(error)) {
      const duplicado = new Error(`Ya existe un plano llamado «${nombre}»`);
      duplicado.duplicado = true;
      throw duplicado;
    }
    throw error;
  }

  return { ruta, nombre };
}

export async function borrarPlano(ruta) {
  const client = getSupabase();

  const { error } = await client.storage.from(BUCKET).remove([ruta]);

  if (error) {
    throw error;
  }

  return true;
}

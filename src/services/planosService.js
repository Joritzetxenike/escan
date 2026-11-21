import supabase from '../providers/supabase/supabaseClient';
import conectividadService from './conectividadService';
import { esErrorDeRed } from '../helpers/redHelper';

/* =======================================================
 * PLANOS DE SECCIÓN / ÁREA (solo lectura, con conexión)
 * =======================================================
 *
 * Bucket `planos` de Supabase Storage, el mismo que gestiona el
 * panel web (web-admin/src/services/planosApi.js):
 *
 *   CARP/plano general.pdf
 *   CARP/A01/detalle.png      ← opcional, por área
 *
 * La app solo LISTA y VE (permiso de lectura para la clave
 * pública, 20261121000000_planos_lectura_movil.sql). Subir y
 * borrar se hace desde el panel.
 *
 * No hay copia local: los planos se consultan con conexión.
 * ======================================================= */

export const BUCKET = 'planos';

export const SIN_CONEXION = 'Necesitas conexión para ver los planos';

const SEGUNDOS_URL = 60 * 60;

/* Supabase solo lo usa como nombre de carpeta: sin barras ni
   nada que permita salirse de ella. */
const SEGMENTO_VALIDO = /^[A-Za-z0-9._-]+$/;

const TIPOS_MIME = {
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
  if (mimetype && TIPOS_MIME[mimetype]) {
    return TIPOS_MIME[mimetype];
  }
  const extension = String(nombre ?? '').split('.').pop()?.toLowerCase();
  return EXTENSIONES[extension] ?? 'otro';
}

/** Sección y área de un código `SECCION-AREA-SUBZONA`. */
export function seccionYArea(ubicacion) {
  const [seccion, area] = String(ubicacion ?? '').split('-');
  return { seccion: seccion || null, area: area || null };
}

/* Antes de cada petición: sin conexión no se intenta (no hay
   copia local que enseñar). Un fallo de red marca la app como
   sin conexión, igual que el resto de servicios. */

const conConexion = async (peticion) => {
  if (!(await conectividadService.estaOnline())) {
    throw new Error(SIN_CONEXION);
  }

  try {
    const resultado = await peticion();
    conectividadService.marcarConexion();
    return resultado;
  } catch (e) {
    if (esErrorDeRed(e)) {
      conectividadService.marcarSinConexion(e);
      throw new Error(SIN_CONEXION);
    }
    throw e;
  }
};

/**
 * Ficheros de la carpeta (sin subcarpetas ni el marcador de
 * carpeta vacía), ordenados por nombre.
 */
export async function listarPlanos(seccion, area) {
  const carpeta = carpetaPlanos(seccion, area);

  return conConexion(async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(carpeta, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw error;

    return (data || [])
      .filter((item) => item.id !== null && !item.name.startsWith('.'))
      .map((item) => ({
        nombre: item.name,
        ruta: `${carpeta}/${item.name}`,
        tipo: tipoDePlano(item.name, item.metadata?.mimetype),
        bytes: item.metadata?.size ?? null,
      }));
  });
}

/** URL temporal (1 h) para ver un plano. */
export async function urlPlano(ruta) {
  return conConexion(async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(ruta, SEGUNDOS_URL);

    if (error) throw error;

    return data.signedUrl;
  });
}

export default {
  BUCKET,
  SIN_CONEXION,
  carpetaPlanos,
  tipoDePlano,
  seccionYArea,
  listarPlanos,
  urlPlano,
};

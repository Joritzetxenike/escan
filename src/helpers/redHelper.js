/**
 * Detección de errores de red.
 *
 * supabase-js no lanza excepciones: devuelve `{ data: null, error }` y los
 * providers re-lanzan ese objeto. Cuando la petición no llega al servidor el
 * `error` no trae `code` de Postgres, sino un `TypeError` de fetch ("Network
 * request failed" en Android/iOS, "fetch failed" en web).
 *
 * Distinguir esto es imprescindible para la sincronización diferida: un fallo
 * de red NO invalida el dato (se encola y se reintenta), mientras que un
 * rechazo del maestro (código inexistente, RLS) sí es un error definitivo.
 */

const PATRONES_RED = [
  'network request failed',
  'failed to fetch',
  'fetch failed',
  'network error',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'timeout',
  'aborted',
];

export function esErrorDeRed(error) {

  if (!error) return false;

  /* TypeError es lo que lanza fetch cuando no hay red */

  if (error instanceof TypeError) return true;

  if (error.name === 'TypeError' || error.name === 'FetchError') {
    return true;
  }

  /* Buscamos el patrón en el mensaje, venga del objeto de Supabase
     o de un Error normal */

  const mensaje = String(
    error.message ?? error
  ).toLowerCase();

  return PATRONES_RED.some((patron) => mensaje.includes(patron));

}

export default { esErrorDeRed };
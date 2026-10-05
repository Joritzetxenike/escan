import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/* =======================================================
 * CLIENTE DE SUPABASE
 * =======================================================
 *
 * Antes este archivo lanzaba `throw` si faltaba la URL o la
 * key. Era un error de diseño: el módulo entra en la cadena
 * de arranque (index.js → App.js → Main.js → servicios →
 * DataProvider → SupabaseProvider) y un `throw` en tiempo de
 * import revienta el bundle entero antes de que React monte
 * nada. En el móvil eso es una pantalla blanca sin logs ni
 * mensajes: el splash blanco se queda ahí para siempre.
 *
 * Pasó de verdad en la 1.0.5. El APK se compila en la nube
 * de EAS, donde `.env` no llega (está en `.gitignore`), así
 * que el bundle embebido salió sin credenciales. Con la 1.0.4
 * no se notó porque una OTA las traía y tapaba el bundle
 * roto; al instalar la 1.0.5, cuyo runtime no tiene OTA, se
 * vio la pantalla blanca.
 *
 * Ahora la configuración rota no rompe el arranque:
 *
 *   - `configError` describe qué falta y lo exporta para que
 *     la app pueda mostrar un aviso legible.
 *   - `supabase` sigue siendo un objeto importable, pero
 *     cualquier llamada lanza con un mensaje claro.
 *
 * El fallo sigue siendo un fallo: solo se ha movido del
 * arranque al primer uso, que es donde se puede ver.
 * ======================================================= */

const faltan = [];

if (!supabaseUrl) faltan.push('EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseKey) faltan.push('EXPO_PUBLIC_SUPABASE_KEY');

export const configError =
  faltan.length === 0
    ? null
    : `Faltan ${faltan.join(' y ')} en la configuración de la app`;

/* Sustituto que acepta cualquier llamada. Los servicios usan
   `supabase.from(...)` y `supabase.rpc(...)`; con el Proxy,
   da igual cuál se toque: siempre sale el mismo error. */

const sinConfigurar = new Proxy(
  {},
  {
    get() {
      throw new Error(configError);
    },
  }
);

const supabase =
  configError === null
    ? createClient(supabaseUrl, supabaseKey)
    : sinConfigurar;

export default supabase;
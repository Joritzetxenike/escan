/* =======================================================
 * TEXTO SIN TILDES
 * =======================================================
 *
 * Criterio del proyecto: en la base de datos no se guardan
 * acentos. La palabra va sin tilde (`ZOCALO`, `BANO`,
 * `Nunez`): evita problemas de codificación entre el ERP, los
 * CSV, Supabase y el móvil, y simplifica las búsquedas.
 *
 * 1. `quitarTildes`: á→a, ñ→n, ü→u (y mayúsculas). El resto
 *    de caracteres no se toca.
 *
 * 2. `crearReparador`: el export del ERP perdió las letras
 *    acentuadas y en su lugar dejó un `?` (`Z?CALO`, `BA?O`,
 *    `DECORACI?N`). Para recuperar la palabra sin tilde se usa
 *    como diccionario el propio fichero: las mismas palabras
 *    aparecen escritas sin `?` en otras descripciones
 *    (`ZOCALO`, `BANO`...). Se prueba cada `?` con A/E/I/O/U/N
 *    y se queda la forma que más aparece en el resto del
 *    fichero.
 *
 *    Solo se repara un `?` ENTRE dos letras. Junto a números o
 *    en un extremo de la palabra (`?12`, `20?`, `N?`, `2?FLOOR`)
 *    es un símbolo (Ø, º, °), no una letra, y se deja tal cual.
 *    Si ninguna forma aparece en el diccionario, tampoco se
 *    inventa: se deja el `?` y se informa.
 * ======================================================= */

const quitarTildes = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const LETRAS_CANDIDATAS = ['A', 'E', 'I', 'O', 'U', 'N'];

const MAX_INTERROGACIONES = 3;

/* Palabra = letras y `?`. Los números y la puntuación separan. */
const RE_PALABRA = /[A-Za-z?]+/g;

/* Respaldo cuando la palabra no aparece en el diccionario. Son
   patrones del castellano casi sin excepciones; si ninguno
   encaja, la palabra se deja con su `?`.

     -CI?N / -SI?N        → -CION / -SION   (REPARACION)
     -R?A                 → -RIA            (TUBERIAS)
     G?E / G?I            → GUE / GUI       (DESGUE)
     vocal ? vocal        → N  (era Ñ)      (BANO, PEQUENA, ESPANOL)
*/
const REGLAS = [
  [/([CS])I\?N/g, '$1ION'],
  [/R\?A/g, 'RIA'],
  [/G\?([EI])/g, 'GU$1'],
  [/([AEIOU])\?(?=[AEIOU])/g, '$1N'],
];

/* Las pocas que no salen ni por diccionario ni por reglas. */
const A_MANO = {
  'RUBIC?N': 'RUBICON',
  'ATR?S': 'ATRAS',
  'ENERG?TICA': 'ENERGETICA',
};

const porReglas = (palabra) => {
  if (A_MANO[palabra]) return A_MANO[palabra];

  let resultado = palabra;
  for (const [patron, reemplazo] of REGLAS) {
    resultado = resultado.replace(patron, reemplazo);
  }
  return resultado.includes('?') ? null : resultado;
};

function crearReparador(descripciones) {
  const vocabulario = new Map();

  for (const d of descripciones) {
    if (!d || d.includes('?')) continue;
    for (const palabra of quitarTildes(d).toUpperCase().match(RE_PALABRA) ?? []) {
      vocabulario.set(palabra, (vocabulario.get(palabra) ?? 0) + 1);
    }
  }

  const cache = new Map();

  const candidatas = (palabra) => {
    let formas = [''];
    for (const ch of palabra) {
      if (ch === '?') {
        formas = formas.flatMap((f) => LETRAS_CANDIDATAS.map((l) => f + l));
      } else {
        formas = formas.map((f) => f + ch);
      }
    }
    return formas;
  };

  const repararPalabra = (palabra) => {
    const clave = palabra.toUpperCase();
    if (cache.has(clave)) return cache.get(clave);

    let resultado = null;

    const n = (clave.match(/\?/g) ?? []).length;

    if (n <= MAX_INTERROGACIONES) {
      let mejor = null;
      let max = 0;
      for (const forma of candidatas(clave)) {
        const veces = vocabulario.get(forma) ?? 0;
        if (veces > max) {
          max = veces;
          mejor = forma;
        }
      }
      resultado = mejor ?? porReglas(clave);
    }

    cache.set(clave, resultado);
    return resultado;
  };

  /**
   * Devuelve `{ texto, cambios: [[antes, despues]], pendientes: [palabra] }`.
   */
  return function reparar(texto) {
    const original = String(texto ?? '');
    const cambios = [];
    const pendientes = [];

    if (!original.includes('?')) {
      return { texto: original, cambios, pendientes };
    }

    const reparado = original.replace(RE_PALABRA, (palabra) => {
      if (!palabra.includes('?')) return palabra;

      /* `?` en un extremo de la palabra, o palabra sin letras:
         es un símbolo (Ø12, 20º, Nº), no una letra perdida. */
      if (!/^[A-Za-z][A-Za-z?]*[A-Za-z]$/.test(palabra)) return palabra;

      const arreglada = repararPalabra(palabra);

      if (!arreglada) {
        pendientes.push(palabra);
        return palabra;
      }

      cambios.push([palabra, arreglada]);
      return arreglada;
    });

    return { texto: reparado, cambios, pendientes };
  };
}

module.exports = { quitarTildes, crearReparador };

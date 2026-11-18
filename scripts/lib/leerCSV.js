const fs = require('fs');

/* =======================================================
 * LECTOR DE CSV PARA LOS IMPORTS
 * =======================================================
 *
 * Los CSV llegan exportados del ERP / Excel, no a mano:
 *
 *   - separador `;` (Excel en español) o `,`  → se detecta
 *   - codificación UTF-8, CP850 (DOS) o Latin-1 → se detecta
 *   - campos entre comillas con `;`, `,` o `""` dentro
 *   - valores y cabeceras con espacios de relleno
 *   - filas totalmente vacías (`;;;;;`)       → se ignoran
 *
 * Cada fila se devuelve como objeto con DOS juegos de claves:
 *
 *   - la cabecera normalizada: mayúsculas, sin acentos y solo
 *     letras/números. `Tipo artículo` → `TIPOARTICULO`,
 *     `Ud. stock` → `UDSTOCK`, `SECCIÓN` → `SECCION`.
 *   - la posición: `COL1`, `COL2`… (1-based), siempre. Sirve
 *     para columnas sin cabecera.
 * ======================================================= */

/* ---------- Codificación ---------- */

/* CP850 (MS-DOS Europa occidental), bytes 0x80-0xFF. */
const CP850 =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐' +
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';

const decodificarCp850 = (buffer) => {
  let texto = '';
  for (const byte of buffer) {
    texto += byte < 0x80 ? String.fromCharCode(byte) : CP850[byte - 0x80];
  }
  return texto;
};

const esUtf8Valido = (buffer) =>
  Buffer.from(buffer.toString('utf8'), 'utf8').equals(buffer);

/* Letras españolas en cada codificación: la que más aparezca
   gana. En CP850 ñ=A4, Ñ=A5, á=A0, é=82, í=A1, ó=A2, ú=A3, Á=B5,
   É=90…; en Latin-1 están en C0-FF. */
const LETRAS_CP850 = new Set([0xa0, 0x82, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xb5, 0x90, 0xd6, 0xe0, 0xe9, 0x81, 0x9a]);
const LETRAS_LATIN1 = new Set([0xe1, 0xe9, 0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xc1, 0xc9, 0xcd, 0xd3, 0xda, 0xfc, 0xdc]);

const detectarCodificacion = (buffer) => {
  if (esUtf8Valido(buffer)) return 'utf8';

  let cp850 = 0;
  let latin1 = 0;
  for (const byte of buffer) {
    if (LETRAS_CP850.has(byte)) cp850 += 1;
    if (LETRAS_LATIN1.has(byte)) latin1 += 1;
  }
  return cp850 >= latin1 ? 'cp850' : 'latin1';
};

const decodificar = (buffer, codificacion) => {
  if (codificacion === 'utf8') return buffer.toString('utf8').replace(/^﻿/, '');
  if (codificacion === 'cp850') return decodificarCp850(buffer);
  return buffer.toString('latin1');
};

/* ---------- Separador ---------- */

const detectarSeparador = (primeraLinea) => {
  const candidatos = [';', ',', '\t'];
  let mejor = ',';
  let max = -1;
  for (const sep of candidatos) {
    const n = primeraLinea.split(sep).length - 1;
    if (n > max) {
      max = n;
      mejor = sep;
    }
  }
  return mejor;
};

/* ---------- Parser (comillas estilo RFC 4180) ---------- */

const parsear = (texto, sep) => {
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"' && campo.trim() === '') {
      campo = '';
      entreComillas = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }

  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
};

/* ---------- Cabeceras ---------- */

const normalizarCabecera = (h) =>
  String(h ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

/* ---------- API ---------- */

async function leerCSV(ruta) {
  const buffer = fs.readFileSync(ruta);
  const codificacion = detectarCodificacion(buffer);
  const texto = decodificar(buffer, codificacion);

  const primeraLinea = texto.split(/\r?\n/, 1)[0] ?? '';
  const separador = detectarSeparador(primeraLinea);

  const [cabeceraCruda = [], ...resto] = parsear(texto, separador);

  const headers = cabeceraCruda.map(normalizarCabecera);

  const filas = [];
  let vacias = 0;

  for (const valores of resto) {
    const limpios = valores.map((v) => v.trim());

    if (limpios.every((v) => v === '')) {
      vacias += 1;
      continue;
    }

    const fila = {};
    limpios.forEach((v, i) => {
      fila[`COL${i + 1}`] = v;
      const h = headers[i];
      if (h && !(h in fila)) fila[h] = v;
    });
    filas.push(fila);
  }

  return {
    filas,
    headers,
    cabeceraOriginal: cabeceraCruda.map((h) => h.trim()),
    separador,
    codificacion,
    vacias,
  };
}

/**
 * Valor de la primera cabecera de `alias` presente en la fila,
 * o '' si no hay ninguna. Los alias van ya normalizados.
 */
function campo(fila, alias) {
  for (const a of alias) {
    if (fila[a] != null && fila[a] !== '') return fila[a];
  }
  return '';
}

/** ¿Alguna de las cabeceras `alias` existe en el fichero? */
function tieneColumna(headers, alias) {
  return alias.some((a) => headers.includes(a) || /^COL\d+$/.test(a));
}

module.exports = { leerCSV, campo, tieneColumna, normalizarCabecera };

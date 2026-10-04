import * as FileSystem from 'expo-file-system/legacy';

import DataProvider from '../providers/DataProvider';
import conectividadService from './conectividadService';
import { esErrorDeRed } from '../helpers/redHelper';
import {
  escribirJson,
  leerJson,
} from '../helpers/archivoHelper';

/* =======================================================
 * COPIA LOCAL DE LOS MAESTROS
 * =======================================================
 *
 * Con la copia local, validar un código escaneado es una
 * búsqueda en un `Set` de memoria: **cero peticiones** y
 * cero latencia, haya red o no.
 *
 * Ficheros en `documentDirectory`:
 *
 *   maestro-articulos.json   { version, actualizado_at,
 *                              total, codigos: [], sic: [] }
 *   maestro-ubicaciones.json  { version, actualizado_at,
 *                              ubicaciones: [] }
 *   maestros-meta.json       { articulos_at, ubicaciones_at,
 *                              rechazada_hasta }
 *
 * El meta va aparte a propósito: al aplazar un refresco hay
 * que escribir una fecha, y no tiene sentido reescribir los
 * 3 MB del maestro para guardar un timestamp.
 *
 * ------------------
 *
 * POLÍTICA DE REFRESCO
 *
 * La copia NO se descarga sola: es una decisión del operario
 * (que puede estar en mitad de un conteo). Lo único automático
 * es el aviso.
 *
 *   sin copia        → descarga OBLIGATORIA: sin copia no hay
 *                      forma de validar nada
 *   copia > 24 h     → banner con [Actualizar] [Ahora no]
 *   tras "Ahora no"   → no se vuelve a preguntar en 12 h
 *   copia > 7 días    → el banner avisa en rojo de que puede
 *                      estar rechazando artículos nuevos
 *
 * Siempre hay un botón ⟳ para forzar la descarga a mano.
 * ======================================================= */

const DIR = FileSystem.documentDirectory;

const ARCHIVO_ARTICULOS =
  `${DIR}maestro-articulos.json`;

const ARCHIVO_UBICACIONES =
  `${DIR}maestro-ubicaciones.json`;

const ARCHIVO_META =
  `${DIR}maestros-meta.json`;

const VERSION = 1;

const HORAS_VIEJO = 24;

const HORAS_ESPERA_PREGUNTA = 12;

const DIAS_PELIGROSO = 7;

/* Margen para esperar a que termine la descarga obligatoria
   mientras el operario ya está escaneando */

const MAX_ESPERA_CARGA_MS = 60000;

const SIN_CONEXION =
  'Sin conexión: hace falta conectar una vez para descargar la copia del maestro';

/* =======================================================
 * ESTADO
 * ======================================================= */

const estadoInicial = {
  hayCopia: false,
  descargando: false,
  descargandoQue: null,
  pideActualizar: false,
  actualizadoAt: null,
  rechazadaHasta: null,
  error: null,
};

let estado = { ...estadoInicial };

const suscriptores = new Set();

let iniciado = false;

let desuscribirConectividad = null;

/* =======================================================
 * CACHÉ EN MEMORIA
 * =======================================================
 *
 * `maestroArticulo` tiene ~211.000 filas. Montarlo una vez
 * como `Set` cuesta unos 15 MB de RAM y hace que cada
 * validación posterior sea O(1).
 *
 * `ubicaciones: null` significa "no se sabe" (el fichero no
 * está o está corrupto), que es distinto de "no existe". En
 * ese caso la ubicación se valida solo por formato, como se
 * hacía antes de tener copia local.
 */

let cache = null;

let cargaPromesa = null;

const notificar = () => {
  suscriptores.forEach((fn) => fn(estado));
};

const setEstado = (cambios) => {
  estado = { ...estado, ...cambios };
  notificar();
};

/* =======================================================
 * UTILIDADES
 * ======================================================= */

const esperar = async (promesa, ms) => {

  let temporizador;

  const limite = new Promise((resolver) => {
    temporizador = setTimeout(
      () => resolver(false),
      ms
    );
  });

  try {
    return await Promise.race([promesa, limite]);
  } finally {
    clearTimeout(temporizador);
  }

};

/**
 * Aplana el árbol sección → área → subzona en una lista de
 * códigos `seccion-area-subzona`.
 */
const aplanarUbicaciones = (arbol) => {

  const codigos = [];

  (arbol ?? []).forEach((seccion) => {
    (seccion?.maestroArea ?? []).forEach((area) => {
      (area?.maestroUbicacion ?? []).forEach(
        (ubicacion) => {
          codigos.push(
            `${seccion.seccion}-${area.area}-${ubicacion.subzona}`
          );
        }
      );
    });
  });

  return codigos;

};

/* =======================================================
 * METADATOS
 * ======================================================= */

const leerMeta = async () => {
  const meta = await leerJson(ARCHIVO_META, {});
  return meta ?? {};
};

const guardarMeta = async (cambios) => {
  const meta = await leerMeta();

  await escribirJson(ARCHIVO_META, {
    ...meta,
    ...cambios,
  });
};

/* =======================================================
 * LECTURA DE LA COPIA
 * ======================================================= */

const construirCache = (articulos, ubicaciones) => {

  if (!Array.isArray(articulos?.codigos)) {
    return null;
  }

  return {
    codigos: new Set(articulos.codigos),
    sic: new Set(articulos.sic ?? []),
    ubicaciones: Array.isArray(ubicaciones?.ubicaciones)
      ? new Set(ubicaciones.ubicaciones)
      : null,
    actualizadoAt:
      Date.parse(articulos.actualizado_at) || null,
  };

};

const cargarDesdeDisco = async () => {

  const [articulos, ubicaciones] =
    await Promise.all([
      leerJson(ARCHIVO_ARTICULOS, null),
      leerJson(ARCHIVO_UBICACIONES, null),
    ]);

  return construirCache(articulos, ubicaciones);

};

/* =======================================================
 * UBICACIONES
 * ======================================================= */

/**
 * Consulta el árbol de ubicaciones y lo deja escrito en disco.
 *
 * No gestiona estado ni captura errores: la usan tanto la
 * descarga completa como la reparación dirigida, y en los dos
 * casos el fallo debe aparecer en el mismo sitio.
 */
const escribirUbicaciones = async () => {

  const arbol =
    await DataProvider.obtenerEstadoUbicaciones();

  const ubicaciones = aplanarUbicaciones(arbol);

  /* Una respuesta vacía significa que la consulta o la RPC
     han fallado. Sobrescribir la copia buena con un fichero
     vacío haría que la app rechazara todos los códigos. */

  if (ubicaciones.length === 0) {
    throw new Error(
      'La consulta de ubicaciones no devolvió ninguna fila'
    );
  }

  const ahora = new Date().toISOString();

  await escribirJson(ARCHIVO_UBICACIONES, {
    version: VERSION,
    actualizado_at: ahora,
    ubicaciones,
  });

  await guardarMeta({
    ubicaciones_at: ahora,
  });

  return { ubicaciones, actualizado: ahora };

};


/**
 * Descarga SOLO las ubicaciones (199 filas).
 *
 * Es una reparación dirigida: el maestro de artículos pesa 3 MB
 * y no tiene sentido obligar a rebajarlo porque falte este
 * fichero. La app se autorrepara en lugar de dejar al
 * operario sin poder validar ubicaciones.
 */
const descargarUbicaciones = async () => {

  if (estado.descargando) {
    return cache?.ubicaciones ?? null;
  }

  setEstado({
    descargando: true,
    descargandoQue: 'ubicaciones',
    error: null,
  });

  try {

    const { ubicaciones } =
      await escribirUbicaciones();

    const codigos = new Set(ubicaciones);

    /* La copia de artículos puede seguir siendo válida */
    if (cache) {
      cache.ubicaciones = codigos;
    }

    conectividadService.marcarConexion();

    setEstado({
      descargando: false,
      descargandoQue: null,
      hayCopia: cache !== null,
      actualizadoAt: cache?.actualizadoAt ?? null,
      error: null,
    });

    return codigos;

  } catch (e) {

    console.error(
      'Error descargando las ubicaciones:',
      e
    );

    if (esErrorDeRed(e)) {
      conectividadService.marcarSinConexion(e);
    }

    setEstado({
      descargando: false,
      descargandoQue: null,
      error: e.message,
    });

    return null;

  }

};


/* =======================================================
 * DESCARGA
 * ======================================================= */

const descargar = async () => {

  /* ---------- ¿Ya está bajando? ---------- */

  if (estado.descargando) {
    return cache !== null;
  }

  setEstado({
    descargando: true,
    descargandoQue: 'ubicaciones',
    error: null,
  });

  try {

/* ---------- 1. UBICACIONES (pequeño) ---------- */

    const { ubicaciones } =
      await escribirUbicaciones();


    /* ---------- 2. ARTÍCULOS (211.000 filas) ---------- */

    setEstado({ descargandoQue: 'articulos' });

    const maestro =
      await DataProvider.obtenerMaestroArticulos();

    const codigos = Array.isArray(maestro?.codigos)
      ? maestro.codigos
      : [];

    const sic = Array.isArray(maestro?.sic)
      ? maestro.sic
      : [];

    /* Igual que con las ubicaciones: un maestro vacío en
       disco rechazaría todos los artículos del almacén. */

    if (codigos.length === 0) {
      throw new Error(
        'La descarga del maestro de artículos llegó vacía'
      );
    }

    const actualizado = new Date().toISOString();

    await escribirJson(ARCHIVO_ARTICULOS, {
      version: VERSION,
      actualizado_at: actualizado,
      total: codigos.length,
      codigos,
      sic,
    });

    await guardarMeta({
      articulos_at: actualizado,
      rechazada_hasta: null,
    });

    /* ---------- Copia en memoria ---------- */

    cache = {
      codigos: new Set(codigos),
      sic: new Set(sic),
      ubicaciones: new Set(ubicaciones),
      actualizadoAt: Date.parse(actualizado),
    };

    conectividadService.marcarConexion();

    setEstado({
      descargando: false,
      descargandoQue: null,
      hayCopia: true,
      pideActualizar: false,
      actualizadoAt: cache.actualizadoAt,
      rechazadaHasta: null,
      error: null,
    });

    return true;

  } catch (e) {

    console.error('Error descargando los maestros:', e);

    /* La copia anterior se conserva intacta: la escritura es
       atómica y solo se llega a `cache` cuando el fichero
       bueno ya está en disco. */

    if (esErrorDeRed(e)) {
      conectividadService.marcarSinConexion(e);
    }

    setEstado({
      descargando: false,
      descargandoQue: null,
      error: e.message,
    });

    return cache !== null;

  }

};

/* =======================================================
 * ASEGURAR QUE HAY COPIA EN MEMORIA
 * ======================================================= */

/**
 * Devuelve `true` si la copia está lista para validar.
 *
 * - Si ya está en memoria, responde al instante.
 * - Si se está descargando, espera a que termine.
 * - Si no hay copia en disco y hay red, la descarga.
 * - Si no hay copia y no hay red, no puede validar.
 *
 * Solo se ocupa del maestro de ARTÍCULOS. Si la copia de
 * ubicaciones falta pero la de artículos está bien, la recupera
 * por su cuenta (son 199 filas) y sigue devolviendo `true`: quien
 * necesita ubicaciones es `UbicacionValidator`, que comprueba su
 * conjunto por separado.
 */
const asegurarListo = async ({
  timeout = MAX_ESPERA_CARGA_MS,
} = {}) => {

  if (cache) return true;

  if (cargaPromesa) {
    return await esperar(cargaPromesa, timeout);
  }

  cargaPromesa = (async () => {

    try {
cache = await cargarDesdeDisco();

      if (cache) {

        setEstado({
          hayCopia: true,
          actualizadoAt: cache.actualizadoAt,
        });

        /* ---------- Copia de ubicaciones ausente ----------

           Es un fichero independiente y de 199 filas. Si se
           ha perdido o está corrupto se recupera aquí solo,
           sin obligar a rebajar los 3 MB del maestro de
           artículos, y sin dejar al operario sin validar. */

        if (cache.ubicaciones === null) {
          await descargarUbicaciones();
        }

        return true;
      }

      /* ---------- Sin copia: hay que bajarla sí o sí ---------- */

      const online = await conectividadService.estaOnline();

      if (!online) {
        setEstado({
          hayCopia: false,
          error: SIN_CONEXION,
        });

        return false;
      }

      return await descargar();

    } finally {
      cargaPromesa = null;
    }

  })();

  return await esperar(cargaPromesa, timeout);

};

/* =======================================================
 * CONSULTAS
 * ======================================================= */

/**
 * `true` / `false` si hay copia, `null` si no se sabe.
 */
const existeArticulo = (codigo) =>
  cache?.codigos.has(codigo) ?? null;

const esSIC = (codigo) =>
  cache?.sic.has(codigo) ?? false;

/**
 * `true` / `false` si se conoce la copia de ubicaciones,
 * `null` si no se sabe (fallo al leer ese fichero).
 */
const existeUbicacion = (codigo) =>
  cache?.ubicaciones?.has(codigo) ?? null;

const antiguedadHoras = () => {
  if (!estado.actualizadoAt) return null;

  return (
    (Date.now() - estado.actualizadoAt) /
    (1000 * 60 * 60)
  );
};

const estaViejo = () => {
  const horas = antiguedadHoras();

  if (horas === null) return true;

  return horas > HORAS_VIEJO;
};

/* =======================================================
 * REFRESCO
 * ======================================================= */

/**
 * Decide si hay que descargar. Descarga sola solo cuando no
 * hay copia (es obligatoria); si la copia está vieja, solo
 * levanta el aviso y espera a que el operario decida.
 */
const evaluarRefresco = async () => {

  const meta = await leerMeta();

  const rechazadaHasta =
    Date.parse(meta.rechazada_hasta) || null;

  setEstado({ rechazadaHasta });

  /* ---------- App recién arrancada ----------
     La caché en memoria está vacía, pero puede perfectamente
     haber una copia en disco. Sin esta comprobación, cada
     arranque creería que es el primer uso y se descargaría
     el maestro entero (3 MB) sin preguntar. */

  if (!cache) {
    cache = await cargarDesdeDisco();
  }

  if (cache) {
    setEstado({
      hayCopia: true,
      actualizadoAt: cache.actualizadoAt,
    });
  }

  /* ---------- Sin copia: obligatoria ---------- */

  if (!cache) {
    const online = await conectividadService.estaOnline();

    if (online) {
      await descargar();
    }

    return;
  }

  /* ---------- Copia al día ---------- */

  if (!estaViejo()) return;

  /* ---------- Aplazada hace poco ---------- */

  if (rechazadaHasta && Date.now() < rechazadaHasta) {
    return;
  }

  /* ---------- Copia vieja: que decida el operario ---------- */

  setEstado({ pideActualizar: true });

};

/**
 * "Ahora no": no se vuelve a preguntar en 12 h. Queda en
 * disco, así que tampoco se pregunta en el siguiente arranque.
 */
const rechazarRefresco = async () => {

  const hasta = new Date(
    Date.now() + HORAS_ESPERA_PREGUNTA * 60 * 60 * 1000
  ).toISOString();

  await guardarMeta({ rechazada_hasta: hasta });

  setEstado({
    pideActualizar: false,
    rechazadaHasta: Date.parse(hasta),
  });

  return true;

};

/* =======================================================
 * ARRANQUE
 * ======================================================= */

const iniciar = () => {

  if (iniciado) return estado;

  iniciado = true;

  /* Cuando vuelve la conexión puede tocar refrescar. Se
     suscribe aquí (y no al revés) para no crear un ciclo de
     importaciones entre los dos servicios. */

  desuscribirConectividad = conectividadService.suscribir(
    (nuevo) => {
      if (nuevo.online === true && !estado.descargando) {
        evaluarRefresco();
      }
    }
  );

  evaluarRefresco();

  return estado;

};

/* =======================================================
 * EXPORT
 * ======================================================= */

const maestrosService = {
  ARCHIVO_ARTICULOS,
  ARCHIVO_UBICACIONES,
  ARCHIVO_META,
  HORAS_VIEJO,
  HORAS_ESPERA_PREGUNTA,
  DIAS_PELIGROSO,
  SIN_CONEXION,

  iniciar,

  obtenerEstado: () => estado,

  suscribir: (fn) => {
    suscriptores.add(fn);
    fn(estado);

    return () => {
      suscriptores.delete(fn);
    };
  },

  asegurarListo,
  existeArticulo,
  esSIC,
  existeUbicacion,

  antiguedadHoras,
  estaViejo,

  descargar,
  descargarUbicaciones,
  evaluarRefresco,
  rechazarRefresco,
};

export default maestrosService;
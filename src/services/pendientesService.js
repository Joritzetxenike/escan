import * as FileSystem from 'expo-file-system/legacy';

import { escribirJson } from '../helpers/archivoHelper';

/* =======================================================
 * COLA DE OPERACIONES PENDIENTES
 * =======================================================
 *
 * Guarda en `pending-operations.json` los movimientos, ediciones,
 * borrados y finalizaciones que aún no ha confirmado el servidor.
 *
 * - Se escribe SIEMPRE antes de dar una operación por buena.
 * - Una operación solo se borra tras la confirmación del servidor.
 * - El `operation_id` se reutiliza en los reintentos; además el
 *   `upsert` de `conteo` es idempotente por PK (ubicacion,item),
 *   así que reintentar nunca duplica filas.
 *
 * El fichero es un `.json`, por lo que no aparece en la pestaña
 * Lista (que solo lista `.csv`) ni se ve afectado al borrar un CSV.
 * ======================================================= */

const DIR = FileSystem.documentDirectory;

const ARCHIVO = `${DIR}pending-operations.json`;

const VERSION = 1;

/* ---------- Tipos de operación ---------- */

export const TIPOS = {
  GUARDAR: 'guardar',
  ACTUALIZAR: 'actualizar',
  ELIMINAR: 'eliminar',
  FINALIZAR: 'finalizar',
};

/* ---------- Coalescencia ---------- */

/**
 * Solo se fusionan dos operaciones de guardado/actualización
 * cuando son consecutivas y hablan del MISMO artículo: el
 * resultado final en el servidor es el último valor guardado.
 *
 * `guardar` seguido de `eliminar` NO se fusionan (el artículo
 * podría existir ya en `conteo` y el borrado debe llegar al
 * servidor), y `finalizar` nunca se fusiona con nada.
 */

const esGuardado = (tipo) =>
  tipo === TIPOS.GUARDAR || tipo === TIPOS.ACTUALIZAR;

const sonFusionables = (a, b) =>
  esGuardado(a.tipo) &&
  esGuardado(b.tipo) &&
  a.ubicacion === b.ubicacion &&
  a.articulo === b.articulo;

/* ---------- Generación de operation_id ---------- */

let contador = 0;

const nuevoOperationId = () => {
  contador += 1;

  const aleatorio = Math.random()
    .toString(36)
    .slice(2, 8);

  return `op-${Date.now()}-${contador}-${aleatorio}`;
};

/* ---------- Lectura / escritura ---------- */

const colaVacia = () => ({
  version: VERSION,
  operaciones: [],
});

/**
 * Devuelve la cola, o `null` si el contenido no es una cola
 * válida (JSON roto o sin `operaciones`).
 */
const parsear = (contenido) => {

  if (!contenido) return colaVacia();

  try {

    const datos = JSON.parse(contenido);

    if (!datos || !Array.isArray(datos.operaciones)) {
      return null;
    }

    return {
      version: datos.version ?? VERSION,
      operaciones: datos.operaciones,
    };

  } catch (e) {

    return null;

  }
};

/* ---------- Cuarentena ----------
 *
 * Antes, una cola corrupta se reiniciaba vacía y la siguiente
 * escritura pisaba el fichero: lo no sincronizado se perdía sin
 * rastro. Ahora el fichero se aparta con otro nombre (que sigue
 * sin acabar en `.csv`, así que no aparece en Lista) para poder
 * recuperarlo a mano, y la app continúa con una cola nueva.
 */

const nombreCuarentena = () =>
  `${DIR}pending-operations.corrupt-${Date.now()}.json`;

const ponerEnCuarentena = async () => {

  const destino = nombreCuarentena();

  try {

    await FileSystem.moveAsync({
      from: ARCHIVO,
      to: destino,
    });

    console.error(
      'Cola de pendientes corrupta: se conserva en',
      destino
    );

  } catch (e) {

    console.error(
      'Cola de pendientes corrupta y no se pudo apartar:',
      e
    );

    /* Sin poder apartarla no se debe seguir: escribir encima
       destruiría lo que quede de ella. */
    throw e;

  }

};

const Persistencia = {

  async leer() {

    let contenido;

    try {

      const info =
        await FileSystem.getInfoAsync(ARCHIVO);

      if (!info.exists) {
        return colaVacia();
      }

      contenido =
        await FileSystem.readAsStringAsync(ARCHIVO);

    } catch (e) {

      /* Fallo de E/S (no de contenido): no se toca el fichero. */
      console.error(
        'Error leyendo la cola de pendientes:',
        e
      );

      return colaVacia();

    }

    const cola = parsear(contenido);

    if (cola) return cola;

    await ponerEnCuarentena();

    return colaVacia();

  },

  /* Escritura atómica (`.tmp` + renombrado): si la app muere a
     mitad, queda la versión anterior entera, no un JSON
     truncado. */
  async escribir(operaciones) {

    await escribirJson(ARCHIVO, {
      version: VERSION,
      operaciones,
    });

  },

};

/* ---------- Escrituras en serie ----------
 *
 * `encolar`, `quitar` y `registrarFallo` leen, modifican y
 * escriben el fichero entero. Si dos se solapan (la
 * sincronización corre en segundo plano mientras el operario
 * sigue guardando), la última escritura pisa a la otra y se
 * pierde una operación. Encadenarlas en una única promesa
 * garantiza que cada una ve el resultado de la anterior.
 */

let colaEscrituras = Promise.resolve();

const enSerie = (tarea) => {

  const resultado = colaEscrituras.then(tarea);

  /* Un fallo no debe bloquear las escrituras siguientes. */
  colaEscrituras = resultado.catch(() => {});

  return resultado;

};

/* =======================================================
 * SERVICIO
 * ======================================================= */

const pendientesService = {

  ARCHIVO,

  TIPOS,

  /* =====================================================
   * LECTURA
   * ===================================================== */

  /* Una lectura nunca debe tumbar la UI: si la cola no se
     puede leer (ni apartar), se informa como vacía. Las
     escrituras, en cambio, sí fallan, para no pisarla. */
  async listar() {
    try {
      const cola = await Persistencia.leer();
      return cola.operaciones;
    } catch (e) {
      return [];
    }
  },

  async contar() {
    const operaciones = await this.listar();
    return operaciones.length;
  },

  /**
   * Devuelve true si la ubicación tiene una finalización
   * pendiente de enviar. Offline, la cola es la única
   * fuente de verdad: una ubicación "terminada" localmente
   * no admite más operaciones.
   */
  async tieneFinalizacionPendiente(ubicacion) {

    const operaciones = await this.listar();

    return operaciones.some(
      (op) =>
        op.tipo === TIPOS.FINALIZAR &&
        op.ubicacion === ubicacion
    );

  },

  /* =====================================================
   * ESCRITURA
   * ===================================================== */

  /**
   * Añade una operación a la cola. Si la última operación
   * pendiente es un guardado/actualización del mismo
   * artículo, se fusionan conservando el `operation_id`
   * original.
   *
   * `matricula` se guarda con la operación: sin ella, lo
   * contado sin conexión llegaría a Supabase sin operario.
   */
  encolar({
    tipo,
    ubicacion,
    articulo = null,
    cantidad = null,
    matricula = null,
    provisional = false,
    ubicacionProvisional = false,
  }) {

    return enSerie(async () => {

      const cola = await Persistencia.leer();

      const ultima = cola.operaciones.at(-1);

      if (ultima && sonFusionables(ultima, { tipo, ubicacion, articulo })) {

        const fusionada = {
          ...ultima,
          /* `guardar` + `actualizar` sigue siendo un `guardar`:
             la fila puede no existir aún en el servidor. */
          tipo:
            ultima.tipo === TIPOS.GUARDAR
              ? TIPOS.GUARDAR
              : tipo,
          cantidad: cantidad ?? ultima.cantidad,
          /* Gana el último operario que tocó el artículo. */
          matricula: matricula ?? ultima.matricula ?? null,
          provisional: provisional || ultima.provisional,
          ubicacion_provisional:
            ubicacionProvisional || ultima.ubicacion_provisional,
          ultimo_error: null,
        };

        cola.operaciones[cola.operaciones.length - 1] =
          fusionada;

        await Persistencia.escribir(cola.operaciones);

        return fusionada;

      }

      const operacion = {
        operation_id: nuevoOperationId(),
        tipo,
        ubicacion,
        articulo,
        cantidad,
        matricula,
        created_at: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
        provisional: Boolean(provisional),
        ubicacion_provisional:
          Boolean(ubicacionProvisional),
      };

      cola.operaciones.push(operacion);

      await Persistencia.escribir(cola.operaciones);

      return operacion;

    });

  },

  /**
   * Elimina una operación. Solo se llama tras la
   * confirmación del servidor.
   */
  quitar(operationId) {

    return enSerie(async () => {

      const cola = await Persistencia.leer();

      cola.operaciones = cola.operaciones.filter(
        (op) => op.operation_id !== operationId
      );

      await Persistencia.escribir(cola.operaciones);

      return true;

    });

  },

  /**
   * Deja constancia del fallo sin borrar la operación.
   * La operación se conserva siempre: nunca se descarta
   * en silencio.
   */
  registrarFallo(operationId, mensaje) {

    return enSerie(async () => {

      const cola = await Persistencia.leer();

      const operacion = cola.operaciones.find(
        (op) => op.operation_id === operationId
      );

      if (!operacion) return false;

      operacion.intentos += 1;

      operacion.ultimo_error = mensaje ?? 'Error desconocido';

      await Persistencia.escribir(cola.operaciones);

      return true;

    });

  },

  /**
   * Borra toda la cola (solo para pruebas).
   */
  vaciar() {

    return enSerie(async () => {

      await Persistencia.escribir([]);

      return true;

    });

  },

};

export default pendientesService;
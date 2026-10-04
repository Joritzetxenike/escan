import * as FileSystem from 'expo-file-system/legacy';

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

const parsear = (contenido) => {

  if (!contenido) return colaVacia();

  try {

    const datos = JSON.parse(contenido);

    if (!datos || !Array.isArray(datos.operaciones)) {
      return colaVacia();
    }

    return {
      version: datos.version ?? VERSION,
      operaciones: datos.operaciones,
    };

  } catch (e) {

    console.error(
      'Cola de pendientes corrupta, se reinicia:',
      e
    );

    return colaVacia();

  }
};

const Persistencia = {

  async leer() {

    try {

      const info =
        await FileSystem.getInfoAsync(ARCHIVO);

      if (!info.exists) {
        return colaVacia();
      }

      const contenido =
        await FileSystem.readAsStringAsync(ARCHIVO);

      return parsear(contenido);

    } catch (e) {

      console.error(
        'Error leyendo la cola de pendientes:',
        e
      );

      return colaVacia();

    }

  },

  async escribir(operaciones) {

    const contenido = JSON.stringify({
      version: VERSION,
      operaciones,
    });

    await FileSystem.writeAsStringAsync(
      ARCHIVO,
      contenido
    );

  },

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

  async listar() {
    const cola = await Persistencia.leer();
    return cola.operaciones;
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
   */
  async encolar({
    tipo,
    ubicacion,
    articulo = null,
    cantidad = null,
    provisional = false,
    ubicacionProvisional = false,
  }) {

    const cola = await Persistencia.leer();

    const ultima = cola.operaciones.at(-1);

    if (ultima && sonFusionables(ultima, { tipo, ubicacion, articulo })) {

      const fusionada = {
        ...ultima,
        tipo,
        cantidad: cantidad ?? ultima.cantidad,
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

  },

  /**
   * Elimina una operación. Solo se llama tras la
   * confirmación del servidor.
   */
  async quitar(operationId) {

    const cola = await Persistencia.leer();

    cola.operaciones = cola.operaciones.filter(
      (op) => op.operation_id !== operationId
    );

    await Persistencia.escribir(cola.operaciones);

    return true;

  },

  /**
   * Deja constancia del fallo sin borrar la operación.
   * La operación se conserva siempre: nunca se descarta
   * en silencio.
   */
  async registrarFallo(operationId, mensaje) {

    const cola = await Persistencia.leer();

    const operacion = cola.operaciones.find(
      (op) => op.operation_id === operationId
    );

    if (!operacion) return false;

    operacion.intentos += 1;

    operacion.ultimo_error = mensaje ?? 'Error desconocido';

    await Persistencia.escribir(cola.operaciones);

    return true;

  },

  /**
   * Borra toda la cola (solo para pruebas).
   */
  async vaciar() {

    await Persistencia.escribir([]);

    return true;

  },

};

export default pendientesService;
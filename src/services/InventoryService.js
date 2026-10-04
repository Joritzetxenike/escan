import DataProvider from '../providers/DataProvider';
import CsvProvider from '../providers/csv/csvProvider';
import ArticuloValidator from '../validators/ArticuloValidator';
import UbicacionValidator from '../validators/UbicacionValidator';
import conectividadService from './conectividadService';
import pendientesService from './pendientesService';
import { esErrorDeRed } from '../helpers/redHelper';
import * as FileSystem from 'expo-file-system/legacy';

/* =======================================================
 * SERVICIO DE INVENTARIO
 * =======================================================
 *
 * Orden de escritura (sincronización diferida):
 *
 *   1. CSV local          → fuente local de verdad, siempre.
 *   2. Cola de pendientes → si no hay conexión (o si la
 *                           petición falla), la operación
 *                           queda guardada en el dispositivo.
 *   3. Supabase           → solo si hay conexión.
 *
 * Una operación sale de la cola únicamente cuando el
 * servidor la confirma. Un fallo de red NO se propaga como
 * error: la UI recibe `{ pendiente: true }` y muestra la
 * operación como pendiente, nunca como guardada.
 * ======================================================= */

const DIR = FileSystem.documentDirectory;

const safeName = (name) =>
  name.replace(/[^a-zA-Z0-9-_]/g, '_');

const eliminarDeCsv = async (ubicacion, articulo) => {
  const path = `${DIR}${safeName(ubicacion)}.csv`;
  try {
    const exists = await FileSystem.getInfoAsync(path);
    if (!exists.exists) return;
    const content = await FileSystem.readAsStringAsync(path);
    const lines = content.split('\n').filter(l => l.trim());
    const filtered = lines.filter(l => {
      const cols = l.split(',');
      return !(cols[0] === ubicacion && cols[1] === articulo);
    });
    await FileSystem.writeAsStringAsync(path, filtered.join('\n'));
  } catch (e) {
    console.error('Error eliminando de CSV:', e);
  }
};

/* =======================================================
 * HELPERS INTERNOS
 * ======================================================= */

const TIPOS = pendientesService.TIPOS;

/**
 * Envía la operación a Supabase si hay conexión. Si no la
 * hay, o si la petición falla por red, la encola y
 * devuelve `{ pendiente: true }`.
 *
 * Un error que NO es de red (código inexistente, RLS) se
 * propaga: es un fallo real que la UI debe mostrar.
 */
const enviarOEncolar = async (
  tipo,
  datos,
  opciones,
  enviar
) => {

  const online = await conectividadService.estaOnline();

  const encolar = async () => {
    await pendientesService.encolar({
      tipo,
      ...datos,
      provisional: opciones.provisionalArticulo === true,
      ubicacionProvisional:
        opciones.ubicacionProvisional === true,
    });

    conectividadService.marcarSinConexion();

    return { pendiente: true };
  };

  /* ---------- Sin conexión: solo cola ---------- */

  if (!online) {
    return await encolar();
  }

  /* ---------- Con conexión: se envía ---------- */

  try {

    const resultado = await enviar();

    conectividadService.marcarConexion();

    return { pendiente: false, resultado };

  } catch (e) {

    if (!esErrorDeRed(e)) throw e;

    conectividadService.marcarSinConexion(e);

    return await encolar();
  }
};

const InventoryService = {

  /* =====================================================
   * CONECTIVIDAD
   * ===================================================== */

  async estaOnline() {
    return await conectividadService.estaOnline();
  },

  async sincronizarPendientes() {
    return await conectividadService.sincronizar();
  },

  /* =====================================================
   * LECTURA
   * ===================================================== */

  async cargarUbicacion(codigoUbicacion) {

    if (await conectividadService.estaOnline()) {

      try {

        const articulos =
          await DataProvider.obtenerArticulosUbicacion(
            codigoUbicacion
          );

        conectividadService.marcarConexion();

        return articulos;

      } catch (e) {

        if (!esErrorDeRed(e)) throw e;

        conectividadService.marcarSinConexion(e);
      }
    }

    /* ---------- Sin conexión: CSV local ---------- */

    return await CsvProvider.obtenerArticulosUbicacion(
      codigoUbicacion
    );
  },

  /**
   * Offline la cola es la única fuente de verdad: si la
   * ubicación tiene una finalización pendiente de enviar, se
   * considera terminada y no admite más operaciones.
   */
  async estaUbicacionFinalizada(codigoUbicacion) {

    if (await conectividadService.estaOnline()) {

      try {

        const ubicacion =
          await DataProvider.obtenerUbicacion(
            codigoUbicacion
          );

        conectividadService.marcarConexion();

        return ubicacion?.stat === 'Fin';

      } catch (e) {

        if (!esErrorDeRed(e)) throw e;

        conectividadService.marcarSinConexion(e);
      }
    }

    return await pendientesService.tieneFinalizacionPendiente(
      codigoUbicacion
    );
  },

  /* =====================================================
   * ESCRITURA
   * ===================================================== */

  async guardarMovimiento(movimiento, opciones = {}) {

    /* ---------- 1. CSV local (siempre) ---------- */

    await CsvProvider.guardarMovimiento(movimiento)
      .catch(e =>
        console.error('Error guardando en CSV:', e)
      );

    /* ---------- 2 y 3. Supabase o cola ---------- */

    return await enviarOEncolar(
      TIPOS.GUARDAR,
      {
        ubicacion: movimiento.ubicacion,
        articulo: movimiento.articulo,
        cantidad: movimiento.cantidad,
      },
      opciones,
      () =>
        DataProvider.guardarMovimiento(movimiento)
    );
  },

  async actualizarMovimiento(movimiento, opciones = {}) {

    await CsvProvider.guardarMovimiento(movimiento)
      .catch(e =>
        console.error('Error actualizando en CSV:', e)
      );

    return await enviarOEncolar(
      TIPOS.ACTUALIZAR,
      {
        ubicacion: movimiento.ubicacion,
        articulo: movimiento.articulo,
        cantidad: movimiento.cantidad,
      },
      opciones,
      () =>
        DataProvider.actualizarMovimiento(movimiento)
    );
  },

  async eliminarMovimiento(ubicacion, articulo) {

    /* ---------- 1. CSV local (siempre) ---------- */

    await eliminarDeCsv(ubicacion, articulo);

    /* ---------- 2 y 3. Supabase o cola ---------- */

    return await enviarOEncolar(
      TIPOS.ELIMINAR,
      { ubicacion, articulo, cantidad: null },
      {},
      () =>
        DataProvider.eliminarMovimiento(ubicacion, articulo)
    );
  },

  async finalizarUbicacion(codigoUbicacion) {

    return await enviarOEncolar(
      TIPOS.FINALIZAR,
      {
        ubicacion: codigoUbicacion,
        articulo: null,
        cantidad: null,
      },
      {},
      () =>
        DataProvider.finalizarUbicacion(codigoUbicacion)
    );
  },

  /* =====================================================
   * VALIDACIÓN
   * ===================================================== */

  async validarArticulo(
    codigoArticulo,
    ubicacion,
    articulosEscaneados
  ) {

    const resultado = await ArticuloValidator.validar(
      codigoArticulo,
      ubicacion,
      articulosEscaneados
    );

    /* ---------- Aceptado sin conexión ---------- */

    if (resultado.provisional) {
      conectividadService.marcarSinConexion();
    }

    return resultado;
  },

  async validarUbicacion(codigoUbicacion) {

    const resultado = await UbicacionValidator.validar(
      codigoUbicacion
    );

    /* ---------- Aceptado sin conexión ---------- */

    if (resultado.ubicacionProvisional) {
      conectividadService.marcarSinConexion();
    }

    return resultado;
  },

  crearMovimiento(ubicacion, articulo, cantidad) {
    return {
      ubicacion,
      articulo,
      cantidad,
    };
  },
};

export default InventoryService;
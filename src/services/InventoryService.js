import DataProvider from '../providers/DataProvider';
import CsvProvider from '../providers/csv/csvProvider';
import ArticuloValidator from '../validators/ArticuloValidator';
import UbicacionValidator from '../validators/UbicacionValidator';
import conectividadService from './conectividadService';
import maestrosService from './maestrosService';
import pendientesService from './pendientesService';
import authService from './authService';
import { esErrorDeRed } from '../helpers/redHelper';

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

const eliminarDeCsv = async (ubicacion, articulo) => {
  try {
    await CsvProvider.eliminarMovimiento(ubicacion, articulo);
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

  const encolar = async ({ sinConexion }) => {
    await pendientesService.encolar({
      tipo,
      ...datos,
      provisional: opciones.provisionalArticulo === true,
      ubicacionProvisional:
        opciones.ubicacionProvisional === true,
    });

    if (sinConexion) {
      conectividadService.marcarSinConexion();
    } else {
      conectividadService.refrescarPendientes();
    }

    return { pendiente: true };
  };

  /* ---------- Sin conexión: solo cola ---------- */

  if (!online) {
    return await encolar({ sinConexion: true });
  }

  /* ---------- Con conexión pero con cola pendiente ----------

     Enviar directo saltándose la cola rompe el orden: un
     `eliminar` antiguo encolado se aplicaría DESPUÉS de un
     guardado nuevo y lo borraría. Mientras quede algo en la
     cola, lo nuevo va detrás y se lanza la sincronización. */

  const pendientes = await pendientesService.contar();

  if (pendientes > 0) {
    const resultado = await encolar({ sinConexion: false });
    conectividadService.sincronizar();
    return resultado;
  }

  /* ---------- Con conexión: se envía ---------- */

  try {

    const resultado = await enviar();

    conectividadService.marcarConexion();

    return { pendiente: false, resultado };

  } catch (e) {

    if (!esErrorDeRed(e)) throw e;

    conectividadService.marcarSinConexion(e);

    return await encolar({ sinConexion: true });
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

  completarDetalle(articulos) {

    return (articulos ?? []).map((item) => {

      const detalle =
        maestrosService.obtenerDetalleArticulo(
          item.articulo
        );

      return {
        ...item,
        dsca: item.dsca || detalle.descripcion,
        unidad: item.unidad || detalle.unidad,
      };

    });

  },

  async cargarUbicacion(codigoUbicacion) {

    if (await conectividadService.estaOnline()) {

      try {

        const articulos =
          await DataProvider.obtenerArticulosUbicacion(
            codigoUbicacion
          );

        conectividadService.marcarConexion();

        return this.completarDetalle(articulos);

      } catch (e) {

        if (!esErrorDeRed(e)) throw e;

        conectividadService.marcarSinConexion(e);
      }
    }

    /* ---------- Sin conexión: CSV local ---------- */

    const articulos =
      await CsvProvider.obtenerArticulosUbicacion(
        codigoUbicacion
      );

    return this.completarDetalle(articulos);
  },

  /**
   * Cantidad ya contada de un artículo en la ubicación según
   * el CSV local (fuente de verdad), o `null` si no está.
   * Sirve para avisar del código repetido y poder sumar.
   */
  async obtenerCantidadGuardada(ubicacion, articulo) {

    const registro =
      await CsvProvider.obtenerRegistroUbicacion(
        ubicacion,
        articulo
      );

    if (registro) return registro.cantidad ?? null;

    /* ---------- No está en el CSV: ¿está en el servidor? ----------

       El CSV puede no tenerlo aunque ya esté contado: se borró
       el CSV, o lo contó otro dispositivo. Sin esta consulta el
       artículo se daría por nuevo y el guardado (cantidad
       absoluta) pisaría en silencio lo que había en `conteo`.

       Si la cola tiene operaciones de este artículo, manda el
       CSV: el servidor aún no refleja lo hecho en el móvil
       (p. ej. un borrado sin sincronizar). */

    const operaciones = await pendientesService.listar();

    const hayPendientes = (operaciones ?? []).some(
      (op) =>
        op.ubicacion === ubicacion &&
        op.articulo === articulo
    );

    if (hayPendientes) return null;

    if (!(await conectividadService.estaOnline())) return null;

    try {

      const remoto =
        await DataProvider.obtenerMovimiento(
          ubicacion,
          articulo
        );

      conectividadService.marcarConexion();

      return remoto?.cantidad ?? null;

    } catch (e) {

      /* Nunca bloquea el conteo: sin respuesta del servidor se
         sigue como hasta ahora, solo con el CSV. */

      if (esErrorDeRed(e)) {
        conectividadService.marcarSinConexion(e);
      } else {
        console.error('No se pudo consultar el conteo remoto:', e);
      }

      return null;

    }

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

    const matricula = authService.obtenerMatricula();

    const movimientoLocal = {
      ...movimiento,
      matricula,
    };

    await CsvProvider.guardarMovimiento(movimientoLocal)
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
        matricula,
      },
      opciones,
      () =>
        DataProvider.guardarMovimiento({
          ubicacion: movimiento.ubicacion,
          articulo: movimiento.articulo,
          cantidad: movimiento.cantidad,
          matricula,
        })
    );
  },

  async actualizarMovimiento(movimiento, opciones = {}) {

    const matricula = authService.obtenerMatricula();

    const movimientoLocal = {
      ...movimiento,
      matricula,
    };

    await CsvProvider.guardarMovimiento(movimientoLocal)
      .catch(e =>
        console.error('Error actualizando en CSV:', e)
      );

    /* La matrícula viaja también al servidor: quien corrige la
       cantidad es quien queda registrado, igual que en el CSV. */

    const datos = {
      ubicacion: movimiento.ubicacion,
      articulo: movimiento.articulo,
      cantidad: movimiento.cantidad,
      matricula,
    };

    return await enviarOEncolar(
      TIPOS.ACTUALIZAR,
      datos,
      opciones,
      () =>
        DataProvider.actualizarMovimiento(datos)
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
   * IMPORTACIÓN DE EMERGENCIA DESDE LA NUBE — COMENTADO
   * =====================================================
   *
   * Sobrescribe el CSV local de una ubicación con los datos
   * de Supabase. Solo se permite si la bandera de emergencia
   * está habilitada (maestros-meta.json). El operario puede
   * seguir escaneando después y sincronizar luego.
   *
   * TODO: Reactivar cuando sea necesario.
   */

/*
  async importarUbicacionDesdeNube(codigoUbicacion) {

    const habilitada =
      await maestrosService.estaHabilitadaImportacionEmergencia();

    if (!habilitada) {
      throw new Error(
        'Importación de emergencia no está habilitada. '
        + 'Contacte con el administrador.'
      );
    }

    const online = await conectividadService.estaOnline();

    if (!online) {
      throw new Error(
        'Sin conexión: no se puede importar desde la nube'
      );
    }

    const registrosNube =
      await DataProvider.obtenerConteoUbicacion(codigoUbicacion);

    await CsvProvider.eliminarUbicacion(codigoUbicacion);

    const importados = [];
    const errores = [];

    for (const fila of registrosNube) {
      try {
        await CsvProvider.guardarMovimiento({
          ubicacion: codigoUbicacion,
          articulo: fila.articulo,
          cantidad: fila.cantidad,
          matricula: fila.matricula ?? '',
        });
        importados.push({
          articulo: fila.articulo,
          cantidad: fila.cantidad,
        });
      } catch (e) {
        errores.push({
          articulo: fila.articulo,
          mensaje: e.message,
        });
      }
    }

    conectividadService.marcarConexion();

    return {
      importados: importados.length,
      errores: errores.length,
      detalles: {
        importados,
        errores,
      },
    };

  },
*/

  /* =====================================================
   * VALIDACIÓN
   * ===================================================== */

  async validarArticulo(
    codigoArticulo,
    ubicacion
  ) {

    const resultado = await ArticuloValidator.validar(
      codigoArticulo,
      ubicacion
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

  /* Sugerencias para la entrada manual de artículos: códigos
     de la copia local que empiezan por lo tecleado. */
  sugerirArticulos(texto, limite) {
    return maestrosService.sugerirArticulos(texto, limite);
  },

  sugerirArticulosConDetalle(texto, limite) {
    return this.sugerirArticulos(texto, limite).map(
      (codigo) => ({
        codigo,
        ...this.obtenerDetalleArticulo(codigo),
      })
    );
  },

  obtenerDetalleArticulo(codigo) {
    return maestrosService.obtenerDetalleArticulo(codigo);
  },
};

export default InventoryService;
import DataProvider from '../providers/DataProvider';
import pendientesService from './pendientesService';
import { esErrorDeRed } from '../helpers/redHelper';

/* =======================================================
 * SINCRONIZACIÓN DIFERIDA
 * =======================================================
 *
 * Envía a Supabase únicamente las operaciones de
 * `pending-operations.json`, en orden y de una en una.
 *
 * Reglas:
 *
 * 1. Una operación solo se elimina de la cola tras la
 *    confirmación del servidor.
 * 2. Se respeta el orden de cada ubicación. Al fallar una
 *    validación se bloquea el resto de esa ubicación (para
 *    no aplicar movements sobre un maestro que no conoce
 *    el artículo) pero se sigue con las demás.
 * 3. Si se cae la red, se para todo: reintentar en orden
 *    inverso dejaría el estado inconsistente.
 * 4. Los códigos aceptados provisionalmente sin conexión
 *    (`provisional` / `ubicacion_provisional`) se validan
 *    contra el maestro antes de aplicarse. Si no existen,
 *    la operación se conserva con su error.
 *
 * Los reintentos no pueden duplicar: `guardarMovimiento`
 * hace upsert sobre la PK (ubicacion,item) y los borrados
 * son idempotentes. No hace falta deduplicar en servidor.
 * ======================================================= */

/* ---------- Aplicación de cada tipo de operación ---------- */

const aplicar = {

  [pendientesService.TIPOS.GUARDAR]: (op) =>
    DataProvider.guardarMovimiento({
      ubicacion: op.ubicacion,
      articulo: op.articulo,
      cantidad: op.cantidad,
    }),

  [pendientesService.TIPOS.ACTUALIZAR]: (op) =>
    DataProvider.actualizarMovimiento({
      ubicacion: op.ubicacion,
      articulo: op.articulo,
      cantidad: op.cantidad,
    }),

  [pendientesService.TIPOS.ELIMINAR]: (op) =>
    DataProvider.eliminarMovimiento(
      op.ubicacion,
      op.articulo
    ),

  [pendientesService.TIPOS.FINALIZAR]: (op) =>
    DataProvider.finalizarUbicacion(op.ubicacion),
};

/* ---------- Validación de lo provisional ---------- */

const esMovimiento = (tipo) =>
  tipo === pendientesService.TIPOS.GUARDAR ||
  tipo === pendientesService.TIPOS.ACTUALIZAR;

async function validarProvisional(op) {

  /* ---------- Ubicación sin validar ---------- */

  if (op.ubicacion_provisional) {

    const ubicacion =
      await DataProvider.obtenerUbicacion(op.ubicacion);

    if (!ubicacion) {
      return `La ubicación ${op.ubicacion} no existe en el maestro`;
    }

  }

  /* ---------- Artículo sin validar ---------- */

  if (esMovimiento(op.tipo) && op.provisional) {

    const articulo =
      await DataProvider.obtenerArticulo(op.articulo);

    if (!articulo) {
      return `El código ${op.articulo} no existe en el maestro`;
    }

  }

  return null;
}

/* =======================================================
 * SERVICIO
 * ======================================================= */

const syncService = {

  async sincronizar() {

    const operaciones = await pendientesService.listar();

    const resumen = {
      aplicadas: 0,
      fallidas: 0,
      errores: [],
      redCaida: false,
    };

    if (operaciones.length === 0) return resumen;

    /* ---------- Ubicaciones bloqueadas ---------- */

    const bloqueadas = new Set();

    for (const op of operaciones) {

      /* ---------- Se cayó la red: paramos ---------- */

      if (resumen.redCaida) break;

      /* ---------- Resto de una ubicación inválida ---------- */

      if (bloqueadas.has(op.ubicacion)) continue;

      /* ---------- Validación de códigos provisionales ---------- */

      try {

        const errorValidacion =
          await validarProvisional(op);

        if (errorValidacion) {

          bloqueadas.add(op.ubicacion);

          resumen.fallidas += 1;

          resumen.errores.push({
            operation_id: op.operation_id,
            ubicacion: op.ubicacion,
            articulo: op.articulo,
            mensaje: errorValidacion,
          });

          await pendientesService.registrarFallo(
            op.operation_id,
            errorValidacion
          );

          continue;

        }

      } catch (e) {

        if (esErrorDeRed(e)) {

          await pendientesService.registrarFallo(
            op.operation_id,
            e.message
          );

          resumen.redCaida = true;

          break;

        }

        bloqueadas.add(op.ubicacion);

        resumen.fallidas += 1;

        resumen.errores.push({
          operation_id: op.operation_id,
          ubicacion: op.ubicacion,
          articulo: op.articulo,
          mensaje: e.message,
        });

        await pendientesService.registrarFallo(
          op.operation_id,
          e.message
        );

        continue;

      }

      /* ---------- Envío ---------- */

      try {

        await aplicar[op.tipo](op);

        await pendientesService.quitar(
          op.operation_id
        );

        resumen.aplicadas += 1;

      } catch (e) {

        console.error(
          'Error sincronizando operación:',
          op.operation_id,
          e
        );

        await pendientesService.registrarFallo(
          op.operation_id,
          e.message
        );

        if (esErrorDeRed(e)) {

          resumen.redCaida = true;

          break;

        }

        bloqueadas.add(op.ubicacion);

        resumen.fallidas += 1;

        resumen.errores.push({
          operation_id: op.operation_id,
          ubicacion: op.ubicacion,
          articulo: op.articulo,
          mensaje: e.message,
        });

      }

    }

    return resumen;

  },

};

export default syncService;
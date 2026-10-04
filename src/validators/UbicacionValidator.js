import maestrosService from '../services/maestrosService';

/* =======================================================
 * VALIDACIÓN DE UBICACIONES
 * =======================================================
 *
 * Igual que el artículo, se valida contra la copia local del
 * maestro, sin red, y **sin excepciones**: para validar hace
 * falta la copia de ubicaciones. Si no está, se rechaza igual
 * que si faltase la copia de artículos.
 *
 * Antes se aceptaba cualquier código con formato correcto
 * cuando el fichero de ubicaciones no se podía leer, pero eso
 * dejaba pasar ubicaciones inventadas en cuanto el operario
 * tecleaba un código a mano: `LIN2-A99-Z99` pasaba el filtro
 * por tener tres partes. Con la entrada manual abiertaOffline,
 * ese atajo era un agujero, así que ya no existe. La app se
 * autorrepara descargando las 199 ubicaciones por su cuenta
 * (`maestrosService.descargarUbicaciones`), de modo que el
 * operario no se queda bloqueado.
 *
 * El formato `seccion-area-subzona` se sigue comprobando
 * siempre, porque no necesita la copia: así una lectura
 * claramente corrupta del escáner se rechaza al instante
 * sin tocar disco.
 *
 * El código se normaliza a mayúsculas y sin espacios antes de
 * validarlo, porque al teclearlo es fácil equivocarse de
 * capitalización y los códigos del maestro son
 * `SECCION-AREA-SUBZONA` en mayúsculas (p. ej. `LIN2-A01-Z01`).
 * ======================================================= */

const PARTES_UBICACION = 3;

const EJEMPLO = 'LIN2-A01-Z01';

class UbicacionValidator {

  validarFormato(codigoUbicacion) {

    if (!codigoUbicacion) return false;

    const partes = codigoUbicacion.split('-');

    return (
      partes.length === PARTES_UBICACION &&
      partes.every(parte => parte.length > 0)
    );

  }

  sinCopia() {

    const error = maestrosService.obtenerEstado().error;

    return {
      ok: false,
      titulo: 'Sin copia de maestros',
      mensaje:
        'No se puede validar la ubicación porque aún no hay copia del maestro en el dispositivo. Conéctate una vez para descargarla.' +
        (error ? `\n\n(${error})` : ''),
    };

  }

  sinCopiaUbicaciones() {

    const error = maestrosService.obtenerEstado().error;

    return {
      ok: false,
      titulo: 'Sin copia de ubicaciones',
      mensaje:
        'No se puede validar la ubicación porque falta la copia de ubicaciones del maestro. Actualiza la copia del maestro (icono ⟳) para poder contarlas.' +
        (error ? `\n\n(${error})` : ''),
    };

  }

  noEncontrada(codigoUbicacion) {

    return {
      ok: false,
      titulo: 'Ubicación no encontrada',
      mensaje:
        `El código ${codigoUbicacion} no está en la copia local del maestro. Si es una ubicación nueva, actualiza la copia del maestro (icono ⟳) antes de usarla.`,
    };

  }

  /**
   * Los códigos del maestro son todos en mayúsculas y sin
   * espacios sobrantes, así que normalizar solo puede ayudar a
   * que coincidan: nunca cambia un código válido por otro.
   */
  normalizar(codigoUbicacion) {

    return String(codigoUbicacion ?? '')
      .trim()
      .toUpperCase();

  }

  async validar(codigoUbicacion) {

    const codigo = this.normalizar(codigoUbicacion);

    if (!codigo) {
      return {
        ok: false,
        titulo: 'Error',
        mensaje: 'El código de ubicación es inválido',
      };
    }

    /* ---------- Formato (no necesita la copia) ---------- */

    if (!this.validarFormato(codigo)) {
      return {
        ok: false,
        titulo: 'Ubicación inválida',
        mensaje:
          `El código ${codigo} no existe como ubicación. El formato es seccion-area-subzona, como ${EJEMPLO}.`,
      };
    }

    /* ---------- Copia del maestro de artículos ---------- */

    const listo = await maestrosService.asegurarListo();

    if (!listo) return this.sinCopia();

    /* ---------- Existencia en la copia de ubicaciones ---------- */

    const existe =
      maestrosService.existeUbicacion(codigo);

    /* `null` = no hay copia de ubicaciones. `asegurarListo()`
       ha intentado recuperarla ya; si sigue sin estar, no hay
       forma de saber si este código existe. */

    if (existe === null) return this.sinCopiaUbicaciones();

    if (!existe) return this.noEncontrada(codigo);

    return {
      ok: true,

      /* `stat` no se guarda en la copia: el estado vive en el
         servidor y lo consulta `estaUbicacionFinalizada`. */
      ubicacion: {
        ubicacion: codigo,
        stat: null,
      },

      /* Siempre `false`: la ubicación se ha validado contra la
         copia, no provisionalmente. El campo sigue existiendo
         porque las operaciones encoladas antes de este cambio
         pueden traer `ubicacion_provisional` y hay que
         revalidarlas contra Supabase al sincronizar. */
      ubicacionProvisional: false,
    };

  }
}

export default new UbicacionValidator();
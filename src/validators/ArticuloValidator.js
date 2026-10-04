import maestrosService from '../services/maestrosService';

/* =======================================================
 * VALIDACIÓN DE ARTÍCULOS
 * =======================================================
 *
 * La validación se hace **siempre contra la copia local** del
 * maestro (`maestroService`), nunca contra Supabase. Así:
 *
 *   - hay red      → sigue siendo instantáneo, sin petición
 *   - no hay red   → funciona igual
 *
 * Una petición por cada artículo escaneado era además un
 * cuello de botella en el almacén.
 *
 * Si el código no está en la copia se RECHAZA. El precio de
 * esta decisión es que un artículo añadido al maestro después
 * de la última descarga no se puede contar hasta que se
 * actualiza la copia, de ahí el aviso del `EstadoBanner`.
 * ======================================================= */

class ArticuloValidator {

  validarUbicacionPrevia(ubicacion) {

    if (!ubicacion) {
      return {
        ok: false,
        titulo: 'Error',
        mensaje: 'Primero escanea una ubicación',
      };
    }

    return null;

  }

  validarDuplicado(codigoArticulo, articulosEscaneados, ubicacion) {

    if (articulosEscaneados.includes(codigoArticulo)) {
      return {
        ok: false,
        titulo: 'Artículo duplicado',
        mensaje:
          `El artículo ${codigoArticulo} ya ha sido escaneado en la ubicación ${ubicacion}`,
      };
    }

    return null;

  }

  /**
   * Mensaje para cuando no hay copia utilizable. Incluye el
   * motivo real del fallo (normalmente una descarga
   * interrumpida) para no dejar al operario sin pistas.
   */
  sinCopia() {

    const error =
      maestrosService.obtenerEstado().error;

    return {
      ok: false,
      titulo: 'Sin copia de maestros',
      mensaje:
        'No se puede validar el código porque aún no hay copia del maestro en el dispositivo. Conéctate una vez para descargarla.' +
        (error ? `\n\n(${error})` : ''),
    };

  }

  noEncontrado(codigoArticulo) {

    return {
      ok: false,
      titulo: 'Artículo no encontrado',
      mensaje:
        `El código ${codigoArticulo} no está en la copia local del maestro. Si es un artículo nuevo, actualiza la copia del maestro (icono ⟳) antes de contarlo.`,
    };

  }

  async validar(codigoArticulo, ubicacion, articulosEscaneados) {

    const sinUbicacion =
      this.validarUbicacionPrevia(ubicacion);

    if (sinUbicacion) return sinUbicacion;

    const duplicado = this.validarDuplicado(
      codigoArticulo,
      articulosEscaneados,
      ubicacion
    );

    if (duplicado) return duplicado;

    /* ---------- Copia local ---------- */

    const listo = await maestrosService.asegurarListo();

    if (!listo) return this.sinCopia();

    if (!maestrosService.existeArticulo(codigoArticulo)) {
      return this.noEncontrado(codigoArticulo);
    }

    return {
      ok: true,
      provisional: false,
      esSIC: maestrosService.esSIC(codigoArticulo),
    };

  }
}

export default new ArticuloValidator();
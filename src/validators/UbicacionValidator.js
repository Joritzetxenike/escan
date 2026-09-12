import DataProvider from '../providers/DataProvider';

const PARTES_UBICACION = 3;

class UbicacionValidator {

  validarFormato(codigoUbicacion) {

    if (!codigoUbicacion) return false;

    const partes = codigoUbicacion.split('-');

    return (
      partes.length === PARTES_UBICACION &&
      partes.every(parte => parte.length > 0)
    );
  }

  async validarExistencia(codigoUbicacion) {
    return await DataProvider.obtenerUbicacion(codigoUbicacion);
  }

  async validar(codigoUbicacion) {

    if (!codigoUbicacion) {
      return {
        ok: false,
        titulo: 'Error',
        mensaje: 'El código de ubicación es inválido',
      };
    }

    if (!this.validarFormato(codigoUbicacion)) {
      return {
        ok: false,
        titulo: 'Ubicación inválida',
        mensaje:
          `El código ${codigoUbicacion} no existe como ubicación` //no sigue el formato seccion-area-subzona (ej. 50100-111-Z101)`,
      };
    }

    const ubicacion =
      await this.validarExistencia(codigoUbicacion);

    if (!ubicacion) {
      return {
        ok: false,
        titulo: 'Ubicación no encontrada',
        mensaje:
          `El código ${codigoUbicacion} no existe en el maestro`,
      };
    }

    return {
      ok: true,
      ubicacion,
    };
  }
}

export default new UbicacionValidator();
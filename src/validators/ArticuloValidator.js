import DataProvider from '../providers/DataProvider';

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

  async validarExistencia(codigoArticulo) {
    return await DataProvider.obtenerArticulo(codigoArticulo);
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

    const articulo =
      await this.validarExistencia(codigoArticulo);

    if (!articulo) {
      return {
        ok: false,
        titulo: 'Artículo no encontrado',
        mensaje:
          `El código ${codigoArticulo} no existe en el maestro`,
      };
    }

    return {
      ok: true,
      articulo,
      esSIC: articulo.tipo === 'SIC',
    };
  }
}

export default new ArticuloValidator();
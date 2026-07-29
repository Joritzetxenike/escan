import DataProvider from '../providers/DataProvider';

const InventoryService = {

  async cargarUbicacion(codigoUbicacion) {
    return await DataProvider.obtenerArticulosUbicacion(codigoUbicacion);
  },

  async guardarMovimiento(movimiento) {
    return await DataProvider.guardarMovimiento(movimiento);
  },

  async validarArticulo(codigoArticulo, ubicacion, articulosEscaneados) {

    if (!ubicacion) {
      return {
        ok: false,
        titulo: 'Error',
        mensaje: 'Primero escanea una ubicación',
      };
    }

    if (articulosEscaneados.includes(codigoArticulo)) {
      return {
        ok: false,
        titulo: 'Artículo duplicado',
        mensaje: `El artículo ${codigoArticulo} ya ha sido escaneado en la ubicación ${ubicacion}`,
      };
    }

    const articulo = await DataProvider.obtenerArticulo(codigoArticulo);

    if (!articulo) {
      return {
        ok: false,
        titulo: 'Artículo no encontrado',
        mensaje: `El código ${codigoArticulo} no existe en el maestro`,
      };
    }

    return {
      ok: true,
      articulo,
      esSIC: articulo.tipo === 'SIC',
    };
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
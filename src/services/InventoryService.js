import DataProvider from '../providers/DataProvider';

const InventoryService = {

  async cargarUbicacion(codigoUbicacion) {
    return await DataProvider.obtenerArticulosUbicacion(codigoUbicacion);
  },

  async guardarMovimiento(movimiento) {
    return await DataProvider.guardarMovimiento(movimiento);
  },

  validarArticulo(codigoArticulo, ubicacion, articulosEscaneados) {

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

    return {
      ok: true,
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
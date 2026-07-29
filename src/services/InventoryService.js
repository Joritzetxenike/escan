import DataProvider from '../providers/DataProvider';
import CsvProvider from '../providers/csv/csvProvider';
import * as FileSystem from 'expo-file-system/legacy';

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

const InventoryService = {

  async cargarUbicacion(codigoUbicacion) {
    return await DataProvider.obtenerArticulosUbicacion(codigoUbicacion);
  },

  async guardarMovimiento(movimiento) {
    const resultado = await DataProvider.guardarMovimiento(movimiento);
    await CsvProvider.guardarMovimiento(movimiento).catch(e => console.error('Error guardando en CSV:', e));
    return resultado;
  },

  async actualizarMovimiento(movimiento) {
    const resultado = await DataProvider.actualizarMovimiento(movimiento);
    await CsvProvider.guardarMovimiento(movimiento).catch(e => console.error('Error actualizando en CSV:', e));
    return resultado;
  },

  async eliminarMovimiento(ubicacion, articulo) {
    const resultado = await DataProvider.eliminarMovimiento(ubicacion, articulo);
    await eliminarDeCsv(ubicacion, articulo);
    return resultado;
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
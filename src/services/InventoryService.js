import DataProvider from '../providers/DataProvider';
import CsvProvider from '../providers/csv/csvProvider';
import ArticuloValidator from '../validators/ArticuloValidator';
import UbicacionValidator from '../validators/UbicacionValidator';
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

  async finalizarUbicacion(codigoUbicacion) {
    return await DataProvider.finalizarUbicacion(codigoUbicacion);
  },

  async estaUbicacionFinalizada(codigoUbicacion) {
    const ubicacion = await DataProvider.obtenerUbicacion(codigoUbicacion);
    return ubicacion?.stat === 'Fin';
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

    return await ArticuloValidator.validar(
      codigoArticulo,
      ubicacion,
      articulosEscaneados
    );
  },

  async validarUbicacion(codigoUbicacion) {

    return await UbicacionValidator.validar(codigoUbicacion);
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
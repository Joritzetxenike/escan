import * as FileSystem from 'expo-file-system/legacy';
import InventoryDataProvider from '../InventoryDataProvider';

const DIR = FileSystem.documentDirectory;

/* =======================================================
 * FUNCIONES PRIVADAS
 * ======================================================= */

const safeName = (name) =>
  name.replace(/[^a-zA-Z0-9-_]/g, '_');

const getUbicacionPath = (ubicacion) =>
  `${DIR}${safeName(ubicacion)}.csv`;

const parseRegistros = (csv) => {
  if (!csv) return [];

  return csv.split('\n').map(line => {
    const [ubicacion, articulo, cantidad] = line.split(',');

    return {
      ubicacion,
      articulo,
      cantidad: Number(cantidad),
    };
  });
};

const serializeRegistros = (registros) =>
  registros
    .map(r => `${r.ubicacion},${r.articulo},${r.cantidad}`)
    .join('\n');

/* =======================================================
 * IMPLEMENTACIÓN
 * ======================================================= */

const CsvProvider = {

  ...InventoryDataProvider,

  async obtenerArticulosUbicacion(ubicacion) {
    try {
      const path = getUbicacionPath(ubicacion);

      const exists = await FileSystem.getInfoAsync(path);

      if (!exists.exists) {
        return [];
      }

      const content = await FileSystem.readAsStringAsync(path);

      return parseRegistros(content);

    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async guardarMovimiento({
    ubicacion,
    articulo,
    cantidad,
  }) {

    const path = getUbicacionPath(ubicacion);

    const registros = await this.obtenerArticulosUbicacion(ubicacion);

    const index = registros.findIndex(
      r => r.articulo === articulo
    );

    if (index >= 0) {
      registros[index].cantidad = cantidad;
    } else {
      registros.push({
        ubicacion,
        articulo,
        cantidad,
      });
    }

    await FileSystem.writeAsStringAsync(
      path,
      serializeRegistros(registros)
    );
  },

  /* ===== Pendientes ===== */

  async obtenerUbicaciones() {
    throw new Error('No implementado');
  },

  async obtenerEstadoUbicaciones() {
    throw new Error('No implementado');
  },

  async existeArticulo() {
    throw new Error('No implementado');
  },

  async obtenerArticulo() {
    throw new Error('No implementado');
  },

  async actualizarMovimiento() {
    throw new Error('No implementado');
  },

  async eliminarMovimiento() {
    throw new Error('No implementado');
  },

  async obtenerUltimosMovimientos() {
    throw new Error('No implementado');
  },

  async estaDisponible() {
    return true;
  },

  async sincronizar() {
    return true;
  }
};

export default CsvProvider;
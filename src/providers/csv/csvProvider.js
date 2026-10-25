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

  return csv
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const [ubicacion, articulo, cantidad, matricula] = line.split(',');

      return {
        ubicacion,
        articulo,
        cantidad: Number(cantidad),
        /* Los CSV antiguos no traen esta columna. */
        matricula: matricula ?? '',
      };
    });
};

const serializeRegistros = (registros) =>
  registros
    .map(r =>
      `${r.ubicacion},${r.articulo},${r.cantidad},${r.matricula ?? ''}`
    )
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

  /**
   * Devuelve la fila `{ ubicacion, articulo, cantidad }` de un
   * artículo en la ubicación, o `null` si no está contado. Se
   * usa para avisar de que un código ya está en el CSV y poder
   * sumarle la cantidad nueva.
   */
  async obtenerRegistroUbicacion(ubicacion, articulo) {

    const registros =
      await this.obtenerArticulosUbicacion(ubicacion);

    return (
      registros.find(r => r.articulo === articulo) ?? null
    );

  },

  async guardarMovimiento({
    ubicacion,
    articulo,
    cantidad,
    matricula = '',
  }) {

    const path = getUbicacionPath(ubicacion);

    const registros = await this.obtenerArticulosUbicacion(ubicacion);

    const index = registros.findIndex(
      r => r.articulo === articulo
    );

    if (index >= 0) {
      registros[index] = {
        ...registros[index],
        cantidad,
        matricula,
      };
    } else {
      registros.push({
        ubicacion,
        articulo,
        cantidad,
        matricula,
      });
    }

    await FileSystem.writeAsStringAsync(
      path,
      serializeRegistros(registros)
    );
  },

  /* ===== Pendientes ===== */

  async obtenerEstadoUbicaciones() {
    throw new Error('No implementado');
  },

  async existeArticulo() {
    throw new Error('No implementado');
  },

  async obtenerArticulo() {
    throw new Error('No implementado');
  },

  async obtenerUbicacion() {
    throw new Error('No implementado');
  },

  async obtenerMaestroArticulos() {
    throw new Error('No implementado');
  },

  async actualizarMovimiento() {
    throw new Error('No implementado');
  },

  async eliminarMovimiento(ubicacion, articulo) {
    const path = getUbicacionPath(ubicacion);

    const exists = await FileSystem.getInfoAsync(path);

    if (!exists.exists) {
      return true;
    }

    const registros = await this.obtenerArticulosUbicacion(ubicacion);

    const filtrados = registros.filter(
      (r) => !(r.ubicacion === ubicacion && r.articulo === articulo)
    );

    await FileSystem.writeAsStringAsync(
      path,
      serializeRegistros(filtrados)
    );

    return true;
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
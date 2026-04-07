import * as FileSystem from 'expo-file-system/legacy';

const DIR = FileSystem.documentDirectory;

// Limpia nombres raros para archivos
const safeName = (name) =>
  name.replace(/[^a-zA-Z0-9-_]/g, '_');

const filePathForUbicacion = (ubicacion) =>
  `${DIR}${safeName(ubicacion)}.csv`;

/* ------------------ UTILIDADES ------------------ */

const parseCsv = (csv) => {
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

const toCsv = (rows) =>
  rows.map(r =>
    `${r.ubicacion},${r.articulo},${r.cantidad}`
  ).join('\n');

/* ------------------ API ------------------ */

// Lee el CSV de una ubicación
export const leerCsvUbicacion = async (ubicacion) => {
  try {
    const path = filePathForUbicacion(ubicacion);
    const exists = await FileSystem.getInfoAsync(path);
    if (!exists.exists) return [];

    const content = await FileSystem.readAsStringAsync(path);
    return parseCsv(content);
  } catch (e) {
    console.error('Error leyendo CSV', e);
    return [];
  }
};

// Guarda o sustituye un registro
export const guardarRegistro = async ({ ubicacion, articulo, cantidad }) => {
  const path = filePathForUbicacion(ubicacion);

  const registros = await leerCsvUbicacion(ubicacion);

  const index = registros.findIndex(
    r => r.articulo === articulo
  );

  if (index >= 0) {
    // ya existe → sustituimos cantidad
    registros[index].cantidad = cantidad;
  } else {
    registros.push({ ubicacion, articulo, cantidad });
  }

  await FileSystem.writeAsStringAsync(
    path,
    toCsv(registros)
  );
};

// Lista todos los CSV existentes
export const listarCsvs = async () => {
  const files = await FileSystem.readDirectoryAsync(DIR);
  return files.filter(f => f.endsWith('.csv'));
};

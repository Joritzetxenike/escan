import * as FileSystem from 'expo-file-system/legacy';

const DIR = FileSystem.documentDirectory;

const safeName = (name) =>
  name.replace(/[^a-zA-Z0-9-_]/g, '_');

export const nombreCsvUbicacion = (ubicacion) =>
  `${safeName(ubicacion)}.csv`;

const filePathForUbicacion = (ubicacion) =>
  `${DIR}${nombreCsvUbicacion(ubicacion)}`;

/* ---------- PARSER ---------- */
const parseCsv = (csv) => {
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

const toCsv = (rows) =>
  rows.map(r =>
    `${r.ubicacion},${r.articulo},${r.cantidad},${r.matricula ?? ''}`
  ).join('\n');

/* ---------- LECTURA ---------- */
export const leerCsvUbicacion = async (ubicacion) => {
  try {
    const path = filePathForUbicacion(ubicacion);
    const exists = await FileSystem.getInfoAsync(path);

    if (!exists.exists) return [];

    const content = await FileSystem.readAsStringAsync(path);
    return parseCsv(content);

  } catch (e) {
    console.error(e);
    return [];
  }
};

/* ---------- GUARDAR ---------- */
export const guardarRegistro = async ({
  ubicacion,
  articulo,
  cantidad,
  matricula = '',
}) => {
  const path = filePathForUbicacion(ubicacion);

  const registros = await leerCsvUbicacion(ubicacion);

  const index = registros.findIndex(r => r.articulo === articulo);

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
    toCsv(registros)
  );
};
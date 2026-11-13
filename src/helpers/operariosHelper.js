import * as FileSystem from 'expo-file-system/legacy';

import operariosPlantilla from '../data/operarios.json';

const DIR = FileSystem.documentDirectory;

const ARCHIVO_OPERARIOS = `${DIR}operarios.json`;

const operariosVacios = [];

/* =======================================================
 * OPERARIOS LOCALES
 * =======================================================
 *
 * Lee la lista de operarios desde
 * documentDirectory/operarios.json. Si no existe, se copia
 * la plantilla desde src/data/operarios.json para que la
 * app funcione desde la primera instalacion.
 *
 * El archivo se mantiene en documentDirectory para poder
 * editar operarios sin recomilar la app.
 * ======================================================= */

const asegurarArchivoOperarios = async () => {
  try {
    const info = await FileSystem.getInfoAsync(ARCHIVO_OPERARIOS);

    if (!info.exists) {
      await FileSystem.writeAsStringAsync(
        ARCHIVO_OPERARIOS,
        JSON.stringify(operariosPlantilla, null, 2)
      );
    }
  } catch (e) {
    console.error('Error asegurando archivo de operarios:', e);
  }
};

const leerOperarios = async () => {
  try {
    await asegurarArchivoOperarios();

    const info = await FileSystem.getInfoAsync(ARCHIVO_OPERARIOS);

    if (!info.exists) {
      return operariosVacios;
    }

    const contenido = await FileSystem.readAsStringAsync(ARCHIVO_OPERARIOS);

    if (!contenido || contenido.trim() === '') {
      return operariosVacios;
    }

    const datos = JSON.parse(contenido);

    if (!Array.isArray(datos)) {
      return operariosVacios;
    }

    return datos;
  } catch (e) {
    console.error('Error leyendo operarios locales:', e);
    return operariosVacios;
  }
};

const normalizarMatricula = (valor) =>
  String(valor ?? '')
    .trim()
    .replace(/\D/g, '')
    .slice(0, 20);

const buscarOperario = async (matricula) => {
  const operarios = await leerOperarios();

  const matriculaNormalizada = normalizarMatricula(matricula);

  return (
    operarios.find(
      (op) => normalizarMatricula(op.matricula) === matriculaNormalizada
    ) ?? null
  );
};

const esOperarioValido = async (matricula) => {
  const operario = await buscarOperario(matricula);

  return operario ? Boolean(operario.activo) : false;
};

const obtenerNombreOperario = async (matricula) => {
  const operario = await buscarOperario(matricula);

  return operario ? operario.nombre : null;
};

export {
  leerOperarios,
  asegurarArchivoOperarios,
  buscarOperario,
  esOperarioValido,
  obtenerNombreOperario,
  ARCHIVO_OPERARIOS,
};

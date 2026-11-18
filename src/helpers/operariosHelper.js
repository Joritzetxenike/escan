import * as FileSystem from 'expo-file-system/legacy';

import operariosPlantilla from '../data/operarios.json';
import DataProvider from '../providers/DataProvider';
import { escribirJson } from './archivoHelper';

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

    let necesitaEscribir = !info.exists;

    if (info.exists) {
      try {
        const contenido = await FileSystem.readAsStringAsync(
          ARCHIVO_OPERARIOS
        );
        const datos = JSON.parse(contenido);
        /* Solo se repone la plantilla si el fichero no sirve.
           Antes también se reescribía si faltaba
           `esAdminEmergencia`: al comentarse ese campo, la
           condición se cumplía siempre y el fichero se pisaba
           en cada login, perdiendo la lista descargada. */
        if (!Array.isArray(datos) || datos.length === 0) {
          necesitaEscribir = true;
        }
      } catch (e) {
        necesitaEscribir = true;
      }
    }

    if (necesitaEscribir) {
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

/* =======================================================
 * DESCARGA DESDE SUPABASE
 * =======================================================
 *
 * La tabla `operarios` es la fuente de verdad. Se descarga con
 * la RPC `descargar_operarios()` y se guarda en el mismo
 * fichero local, que es lo que usa el login (también sin red).
 *
 * Nunca lanza: sin red o con error, el login sigue con la copia
 * que haya. Una respuesta vacía no sustituye a una copia buena
 * (dejaría a todo el mundo fuera).
 * ======================================================= */

const esOperarioCorrecto = (op) =>
  op &&
  typeof op.matricula === 'string' &&
  op.matricula.trim() !== '' &&
  typeof op.nombre === 'string';

let descargaEnCurso = null;

const actualizarOperarios = () => {

  if (descargaEnCurso) return descargaEnCurso;

  descargaEnCurso = (async () => {

    try {

      const remotos = await DataProvider.obtenerOperarios();

      const operarios = (remotos ?? [])
        .filter(esOperarioCorrecto)
        .map((op) => ({
          matricula: op.matricula,
          nombre: op.nombre,
          activo: op.activo !== false,
        }));

      if (operarios.length === 0) return false;

      await escribirJson(ARCHIVO_OPERARIOS, operarios);

      return true;

    } catch (e) {

      console.error('No se pudieron descargar los operarios:', e);

      return false;

    } finally {

      descargaEnCurso = null;

    }

  })();

  return descargaEnCurso;

};

export {
  actualizarOperarios,
  leerOperarios,
  asegurarArchivoOperarios,
  buscarOperario,
  esOperarioValido,
  obtenerNombreOperario,
  ARCHIVO_OPERARIOS,
};

/* =======================================================
 * SESIÓN DEL OPERARIO
 * =======================================================
 *
 * La matrícula vive solo en memoria: al arrancar la app
 * siempre se pide de nuevo. No se persiste a propósito.
 *
 * La validación se hace contra el archivo local
 * documentDirectory/operarios.json (lista de operarios con
 * matrícula y nombre). Si la matrícula no existe o no está
 * activa, se rechaza el acceso.
 *
 * Toda la lógica de `esAdminEmergencia` e importación de
 * emergencia está comentada temporalmente.
 * ======================================================= */

import {
  buscarOperario,
} from '../helpers/operariosHelper';

const MAX_LONGITUD = 20;

let sesion = null;

const normalizarMatricula = (valor) =>
  String(valor ?? '')
    .trim()
    .replace(/\D/g, '')
    .slice(0, MAX_LONGITUD);

const validarMatricula = async (valor) => {
  const matricula = normalizarMatricula(valor);

  if (!matricula) {
    return {
      valida: false,
      matricula: null,
      nombre: null,
      error: 'Introduce tu matrícula',
    };
  }

  const operario = await buscarOperario(matricula);

  if (!operario) {
    return {
      valida: false,
      matricula: null,
      nombre: null,
      error: `La matrícula ${matricula} no está registrada`,
    };
  }

  if (!operario.activo) {
    return {
      valida: false,
      matricula: null,
      nombre: operario.nombre,
      error: `La matrícula ${matricula} está desactivada`,
    };
  }

  return {
    valida: true,
    matricula,
    nombre: operario.nombre,
    error: null,
  };
};

const iniciarSesion = (matricula, nombre) => {
  const normalizada = normalizarMatricula(matricula);

  sesion = normalizada
    ? {
        matricula: normalizada,
        nombre: nombre ?? null,
        iniciadaAt: new Date().toISOString(),
      }
    : null;

  return sesion;
};

const cerrarSesion = () => {
  sesion = null;
};

const obtenerSesion = () => sesion;

const obtenerMatricula = () =>
  sesion?.matricula ?? null;

const obtenerNombre = () =>
  sesion?.nombre ?? null;

const haySesion = () => sesion !== null;

const authService = {
  MAX_LONGITUD,
  normalizarMatricula,
  validarMatricula,
  iniciarSesion,
  cerrarSesion,
  obtenerSesion,
  obtenerMatricula,
  obtenerNombre,
  haySesion,
};

export default authService;

/* =======================================================
 * SESIÓN DEL OPERARIO
 * =======================================================
 *
 * La matrícula vive solo en memoria: al arrancar la app
 * siempre se pide de nuevo. No se persiste a propósito.
 *
 * `validarMatricula` es el único punto que habrá que tocar
 * cuando la matrícula tenga que existir en Supabase. Hoy
 * acepta cualquier número no vacío.
 * ======================================================= */

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
      error: 'Introduce tu matrícula',
    };
  }

  /* TODO: validar contra Supabase cuando exista la tabla
     de operarios. La firma no cambiará. */

  return {
    valida: true,
    matricula,
    error: null,
  };
};

const iniciarSesion = (matricula) => {
  const normalizada = normalizarMatricula(matricula);

  sesion = normalizada
    ? {
        matricula: normalizada,
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

const haySesion = () => sesion !== null;

const authService = {
  MAX_LONGITUD,
  normalizarMatricula,
  validarMatricula,
  iniciarSesion,
  cerrarSesion,
  obtenerSesion,
  obtenerMatricula,
  haySesion,
};

export default authService;

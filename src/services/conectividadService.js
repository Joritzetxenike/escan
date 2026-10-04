import { AppState } from 'react-native';

import DataProvider from '../providers/DataProvider';
import pendientesService from './pendientesService';
import syncService from './syncService';

/* =======================================================
 * CONECTIVIDAD
 * =======================================================
 *
 * No se añade ninguna dependencia nativa (NetInfo/expo-network)
 * para poder desplegar esto por OTA sin rehacer el APK: el
 * estado de conexión se deduce de una sonda ligera a Supabase
 * (`DataProvider.estaDisponible()`).
 *
 * Se comprueba la conexión:
 *   - al iniciar la app,
 *   - al volver a primer plano,
 *   - cada 30 s mientras se está sin conexión,
 *   - y de forma reactiva cuando cualquier petición falla
 *     (`marcarSinConexion`) o sale bien (`marcarConexion`).
 *
 * Cuando se recupera la conexión se dispara la sincronización
 * de la cola de pendientes una sola vez.
 * ======================================================= */

const INTERVALO_REINTENTO_MS = 30000;

const estadoInicial = {
  /* null = todavía no se ha comprobado */
  online: null,
  comprobando: false,
  sincronizando: false,
  pendientes: 0,
  ultimoIntento: null,
  ultimoError: null,
};

let estado = { ...estadoInicial };

const suscriptores = new Set();

let timerReintento = null;

let iniciado = false;

/* =======================================================
 * ESTADO
 * ======================================================= */

const notificar = () => {
  suscriptores.forEach((fn) => fn(estado));
};

const setEstado = (cambios) => {
  estado = { ...estado, ...cambios };
  notificar();
};

const obtenerEstado = () => estado;

const suscribir = (fn) => {
  suscriptores.add(fn);

  /* Immediately reflects the current state so a UI that mounts
     late doesn't show stale data */

  fn(estado);

  return () => {
    suscriptores.delete(fn);
  };
};

/* =======================================================
 * REINTENTO PERIÓDICO
 * ======================================================= */

const detenerReintento = () => {
  if (timerReintento) {
    clearTimeout(timerReintento);
    timerReintento = null;
  }
};

const programarReintento = () => {
  if (timerReintento) return;

  timerReintento = setTimeout(() => {
    timerReintento = null;
    comprobar();
  }, INTERVALO_REINTENTO_MS);
};

/* =======================================================
 * PENDIENTES
 * ======================================================= */

const refrescarPendientes = async () => {
  const pendientes = await pendientesService.contar();

  if (pendientes !== estado.pendientes) {
    setEstado({ pendientes });
  }

  return pendientes;
};

/* =======================================================
 * SINCRONIZACIÓN
 * ======================================================= */

const sincronizar = async () => {

  if (estado.sincronizando) return null;

  setEstado({ sincronizando: true });

  let resumen;

  try {

    resumen = await syncService.sincronizar();

  } catch (e) {

    console.error('Error sincronizando:', e);

    setEstado({
      online: false,
      ultimoError: { mensaje: e.message },
    });

    programarReintento();

    await refrescarPendientes();

    setEstado({ sincronizando: false });

    return null;

  }

  /* ---------- Error de validación (no de red) ---------- */

  const primerError = resumen?.errores?.[0];

  if (primerError) {
    setEstado({
      ultimoError: {
        mensaje: primerError.mensaje,
        operation_id: primerError.operation_id,
      },
    });
  }

  /* ---------- Todo limpio ---------- */

  if (resumen && !primerError && !resumen.redCaida) {
    setEstado({ ultimoError: null });
  }

  /* ---------- Se cayó la red al enviar ---------- */

  if (resumen?.redCaida) {
    setEstado({ online: false });
    programarReintento();
  }

  await refrescarPendientes();

  setEstado({ sincronizando: false });

  return resumen;

};

/* =======================================================
 * COMPROBACIÓN
 * ======================================================= */

const comprobar = async () => {

  if (estado.comprobando) {
    return estado.online;
  }

  setEstado({ comprobando: true });

  try {

    const disponible =
      await DataProvider.estaDisponible();

    const estabaSinConexion = estado.online === false;

    if (disponible) {
      setEstado({
        online: true,
        ultimoIntento: Date.now(),
      });

      detenerReintento();

      /* ---------- Recuperó la conexión ---------- */

      if (estabaSinConexion) {
        await sincronizar();
      }

    } else {

      setEstado({
        online: false,
        ultimoIntento: Date.now(),
      });

      programarReintento();

    }

  } catch (e) {

    setEstado({
      online: false,
      ultimoIntento: Date.now(),
    });

    programarReintento();

  } finally {

    setEstado({ comprobando: false });

  }

  return estado.online;

};

/**
 * Indica si hay conexión. Solo sondea cuando aún no se
 * conoce el estado: con la conexión ya establecida se
 * responde al instante (si la red cae de golpe, lo detecta
 * el propio error de la petición y `marcarSinConexion`).
 */
const estaOnline = async () => {
  if (estado.online === false) return false;

  if (estado.online === null) {
    return (await comprobar()) === true;
  }

  return true;
};

/* =======================================================
 * AVISOS DESDE LOS SERVICIOS
 * ======================================================= */

/**
 * Una petición ha fallado por red: la app pasa a estado
 * "sin conexión" y queda a la espera de la sincronización.
 */
const marcarSinConexion = (error) => {

  const cambios = { online: false };

  if (error?.message) {
    cambios.ultimoError = { mensaje: error.message };
  }

  setEstado(cambios);

  programarReintento();

  refrescarPendientes();

  return estado;
};

/**
 * Una petición ha salido bien: hay conexión.
 */
const marcarConexion = () => {

  if (estado.online === true) {
    return estado;
  }

  const estabaSinConexion = estado.online === false;

  detenerReintento();

  setEstado({ online: true });

  /* ---------- Veníamos de sin conexión ---------- */

  if (estabaSinConexion) {
    sincronizar();
  }

  refrescarPendientes();

  return estado;

};
/* =======================================================
 * ARRANQUE
 * ======================================================= */

const iniciar = () => {

  if (iniciado) return estado;

  iniciado = true;

  AppState.addEventListener('change', (siguiente) => {
    if (siguiente === 'active') {
      comprobar();
    }
  });

  refrescarPendientes();

  comprobar();

  return estado;
};

/* =======================================================
 * EXPORT
 * ======================================================= */

const conectividadService = {
  INTERVALO_REINTENTO_MS,
  iniciar,
  obtenerEstado,
  suscribir,
  comprobar,
  estaOnline,
  marcarSinConexion,
  marcarConexion,
  sincronizar,
  refrescarPendientes,
};

export default conectividadService;
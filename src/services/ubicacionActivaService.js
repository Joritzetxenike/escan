import * as FileSystem from 'expo-file-system/legacy';

import { escribirJson, leerJson } from '../helpers/archivoHelper';

/* =======================================================
 * UBICACIÓN ACTIVA DEL DISPOSITIVO
 * =======================================================
 *
 * Guarda la ubicación que el operario está contando para que
 * no se pierda al cerrar la app. Es un estado del DISPOSITIVO,
 * no de la sesión: no se borra al cerrar sesión.
 *
 * Solo guarda el código. El estado real (abierta o `Fin`) se
 * consulta a la nube; sin conexión se usa la cola de
 * finalizaciones pendientes.
 * ======================================================= */

const ARCHIVO =
  `${FileSystem.documentDirectory}ubicacion-activa.json`;

const VERSION = 1;

const normalizar = (codigo) =>
  String(codigo ?? '').trim().toUpperCase();

const Persistencia = {

  async obtener() {

    const datos = await leerJson(ARCHIVO, null);

    const ubicacion = normalizar(datos?.ubicacion);

    return ubicacion || null;

  },

  async guardar(codigo) {

    const ubicacion = normalizar(codigo);

    if (!ubicacion) return null;

    await escribirJson(ARCHIVO, {
      version: VERSION,
      ubicacion,
      actualizado_at: new Date().toISOString(),
    });

    return ubicacion;

  },

  async limpiar() {

    const info = await FileSystem.getInfoAsync(ARCHIVO);

    if (info.exists) {
      await FileSystem.deleteAsync(ARCHIVO, {
        idempotent: true,
      });
    }

  },

  async limpiarSiCoincide(codigo) {

    const activa = await Persistencia.obtener();

    if (activa && activa === normalizar(codigo)) {
      await Persistencia.limpiar();
    }

    return activa;

  },

};

export default Persistencia;

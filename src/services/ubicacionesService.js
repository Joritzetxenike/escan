import DataProvider from '../providers/DataProvider';

export async function obtenerSecciones() {
  try {
    const datos = await DataProvider.obtenerSecciones();
    return datos;
  } catch (error) {
    console.error('❌ obtenerSecciones:', error);
    throw error;
  }
}

export async function obtenerAreas(seccion) {
  try {
    const datos = await DataProvider.obtenerAreas(seccion);
    return datos;
  } catch (error) {
    console.error('❌ obtenerAreas:', error);
    throw error;
  }
}

export async function obtenerUbicacionesDeArea(seccion, area) {
  try {
    const datos = await DataProvider.obtenerUbicacionesArea(seccion, area);
    return datos;
  } catch (error) {
    console.error('❌ obtenerUbicacionesDeArea:', error);
    throw error;
  }
}

export async function obtenerEstadoUbicaciones() {
  try {
    const datos = await DataProvider.obtenerEstadoUbicaciones();
    return datos;
  } catch (error) {
    console.error('❌ obtenerEstadoUbicaciones:', error);
    throw error;
  }
}
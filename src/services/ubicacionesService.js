import DataProvider from '../providers/DataProvider';

export async function obtenerUbicaciones() {
  console.log('1️⃣ ubicacionesService: llamando a DataProvider');

  try {
    const datos = await DataProvider.obtenerUbicaciones();

    console.log('2️⃣ ubicacionesService: datos recibidos:', datos);

    return datos;
  } catch (error) {
    console.error('❌ ubicacionesService:', error);
    throw error;
  }
}
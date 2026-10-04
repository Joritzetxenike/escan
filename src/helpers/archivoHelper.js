import * as FileSystem from 'expo-file-system/legacy';

/* =======================================================
 * ESCRITURA ATÓMICA DE FICHEROS
 * =======================================================
 *
 * Escribir un fichero de datos directamente con
 * `writeAsStringAsync` tiene un problema: si la app muere a
 * mitad de la escritura (el sistema mata las apps en
 * segundo plano, se queda sin batería, un cierre unexpected)
 * el fichero queda TRUNCADO. Al leerlo después, el JSON no
 * parsea y, en el caso de la cola de pendientes, significa
 * que se ha perdido todo lo que no se había sincronizado.
 *
 * La solución es no escribir nunca en el destino final:
 *
 *   1. se escribe en `<archivo>.tmp`
 *   2. se renombra a `<archivo>`
 *
 * El renombrado es una operación atómica del sistema de
 * ficheros, así que el destino pasa de "versión antigua" a
 * "versión nueva" sin estados intermedios. Si la app muere
 * entre los dos pasos, lo que queda es el `.tmp` huérfano y
 * el fichero bueno intacto.
 * ======================================================= */

/**
 * Escribe un contenido de forma atómica.
 */
export async function escribirAtomico(path, contenido) {

  const temporal = `${path}.tmp`;

  await FileSystem.writeAsStringAsync(temporal, contenido);

  try {
    await FileSystem.moveAsync({
      from: temporal,
      to: path,
    });
  } catch (e) {
    /* Algunos sistemas no permiten renombrar encima de un
       fichero que ya existe. Se borra el destino y se
       reintenta: peor caso se pierde la atomicidad, pero
       nunca el fichero anterior (lo que se perdería es la
       copia vieja, y eso ya se ha escrito entero). */
    const info = await FileSystem.getInfoAsync(path);

    if (info.exists) {
      await FileSystem.deleteAsync(path, {
        idempotent: true,
      });
    }

    await FileSystem.moveAsync({
      from: temporal,
      to: path,
    });
  }

  return true;

}

/**
 * Escribe un objeto como JSON de forma atómica.
 */
export async function escribirJson(path, datos) {
  return await escribirAtomico(
    path,
    JSON.stringify(datos)
  );
}

/**
 * Lee un JSON. Si no existe o está corrupto devuelve
 * `porDefecto` en lugar de lanzar: un fichero de caché
 * corrupto nunca debe tumbar la app.
 */
export async function leerJson(path, porDefecto = null) {

  try {

    const info = await FileSystem.getInfoAsync(path);

    if (!info.exists) return porDefecto;

    const contenido =
      await FileSystem.readAsStringAsync(path);

    if (!contenido) return porDefecto;

    return JSON.parse(contenido);

  } catch (e) {
    console.error(
      'No se pudo leer el JSON:',
      path,
      e
    );

    return porDefecto;
  }

}

export default { escribirAtomico, escribirJson, leerJson };
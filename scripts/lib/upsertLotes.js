const BATCH_SIZE = 2000;

/**
 * Upsert por lotes.
 *
 * `actualizar`:
 *   - false (por defecto): las filas que ya existen NO se tocan
 *     (`ignoreDuplicates`). Es lo que necesitan las ubicaciones,
 *     para no devolver a `Inicio` una ubicación ya contada.
 *   - true: las filas existentes se actualizan con los valores
 *     del CSV (artículos: descripción/tipo/unidad; operarios:
 *     nombre/activo, para poder dar de baja).
 *
 * Nunca borra filas.
 */
async function upsertLotes(client, tabla, filas, onConflict, { actualizar = false, alProgresar } = {}) {
  let enviadas = 0;
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE);
    const { error } = await client
      .from(tabla)
      .upsert(lote, { onConflict, ignoreDuplicates: !actualizar });
    if (error) {
      error.message = `${error.message} (lote ${i / BATCH_SIZE + 1}, filas ${i + 1}-${i + lote.length})`;
      throw error;
    }
    enviadas += lote.length;
    if (alProgresar) alProgresar(enviadas, filas.length);
  }
  return enviadas;
}

module.exports = { upsertLotes, BATCH_SIZE };

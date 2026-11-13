const BATCH_SIZE = 2000;

async function upsertLotes(client, tabla, filas, onConflict) {
  let enviadas = 0;
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE);
    const { error } = await client
      .from(tabla)
      .upsert(lote, { onConflict, ignoreDuplicates: true });
    if (error) throw error;
    enviadas += lote.length;
  }
  return enviadas;
}

module.exports = { upsertLotes, BATCH_SIZE };

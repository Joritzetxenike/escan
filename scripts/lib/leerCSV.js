const fs = require('fs');
const readline = require('readline');

async function leerCSV(ruta) {
  const filas = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(ruta, 'utf8'),
    crlfDelay: Infinity,
  });

  let headers = null;

  for await (const linea of rl) {
    if (linea.trim() === '') continue;

    const valores = linea.split(',');

    if (!headers) {
      headers = valores.map((h) => h.trim());
      continue;
    }

    const fila = {};
    headers.forEach((h, i) => {
      fila[h] = valores[i] != null ? valores[i].trim() : '';
    });
    filas.push(fila);
  }

  return { filas, headers };
}

module.exports = { leerCSV };

require('dotenv').config();
const path = require('path');
const { crearCliente } = require('./lib/supabaseClient');
const { upsertLotes } = require('./lib/upsertLotes');
const { leerCSV } = require('./lib/leerCSV');

const STAT_INICIO = 'Inicio';

function normalizarTexto(t) {
  return String(t == null ? '' : t)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function contar(client, tabla) {
  const { count, error } = await client
    .from(tabla)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const posicionales = args.filter((a) => !a.startsWith('--'));
  const filePath = posicionales[0]
    ? path.resolve(process.cwd(), posicionales[0])
    : path.resolve(__dirname, '..', 'articulos.csv');
  const dryRun = flags.includes('--dry-run');

  if (!require('fs').existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importArticulos.js [ruta.csv] [--dry-run]');
    process.exit(1);
  }

  const { filas } = await leerCSV(filePath);

  const articulos = [];
  const problemas = [];

  filas.forEach((fila, i) => {
    const numFila = i + 2;
    const item = normalizarTexto(fila.ITEM);
    const dsca = normalizarTexto(fila.DSCA);
    const tipo = normalizarTexto(fila.TIPO);
    const unidad = normalizarTexto(fila.UNIDAD);

    if (!item) {
      problemas.push(`Fila ${numFila}: falta ITEM`);
      return;
    }
    if (!dsca) {
      problemas.push(`Fila ${numFila}: falta DSCA`);
      return;
    }

    const row = { item, dsca };
    if (tipo) row.tipo = tipo;
    if (unidad) row.unidad = unidad;

    articulos.push(row);
  });

  if (problemas.length) {
    console.error('\n=== Problemas encontrados en el CSV ===');
    problemas.forEach((p) => console.error(' - ' + p));
    console.error('\nAbortando import.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n=== DRY RUN: ${path.basename(filePath)} ===`);
    console.log(`Articulos a importar: ${articulos.length}`);
    const muestra = articulos.slice(0, 5);
    if (muestra.length) {
      console.log('Muestra:');
      muestra.forEach((f) => console.log(JSON.stringify(f)));
    }
    console.log('\nImport simulado, no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  console.log(`\n=== IMPORT ARTICULOS: ${path.basename(filePath)} ===`);

  const antes = await contar(client, 'maestroArticulo');

  if (articulos.length) {
    await upsertLotes(client, 'maestroArticulo', articulos, 'item');
    console.log(`maestroArticulo: ${articulos.length} filas procesadas`);
  } else {
    console.log('Sin articulos en el CSV.');
  }

  const despues = await contar(client, 'maestroArticulo');

  console.log(`\n=== Conteos (antes → despues) ===`);
  console.log(`maestroArticulo : ${antes} → ${despues}`);
  console.log('\nImport completado.');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

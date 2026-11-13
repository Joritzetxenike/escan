require('dotenv').config();
const path = require('path');
const { crearCliente } = require('./lib/supabaseClient');
const { upsertLotes } = require('./lib/upsertLotes');
const { leerCSV } = require('./lib/leerCSV');

function normalizarTexto(t) {
  return String(t == null ? '' : t)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarBooleano(t) {
  const v = String(t == null ? '' : t).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'si' || v === 'sí';
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
    : path.resolve(__dirname, '..', 'operarios.csv');
  const dryRun = flags.includes('--dry-run');

  if (!require('fs').existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importOperarios.js [ruta.csv] [--dry-run]');
    process.exit(1);
  }

  const { filas } = await leerCSV(filePath);

  const operarios = [];
  const problemas = [];

  filas.forEach((fila, i) => {
    const numFila = i + 2;
    const matricula = normalizarTexto(fila.MATRICULA);
    const nombre = fila.NOMBRE != null ? fila.NOMBRE.trim() : '';
    const activo = normalizarBooleano(fila.ACTIVO);

    if (!matricula) {
      problemas.push(`Fila ${numFila}: falta MATRICULA`);
      return;
    }
    if (!nombre) {
      problemas.push(`Fila ${numFila}: falta NOMBRE`);
      return;
    }

    operarios.push({ matricula, nombre, activo });
  });

  if (problemas.length) {
    console.error('\n=== Problemas encontrados en el CSV ===');
    problemas.forEach((p) => console.error(' - ' + p));
    console.error('\nAbortando import.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n=== DRY RUN: ${path.basename(filePath)} ===`);
    console.log(`Operarios a importar: ${operarios.length}`);
    const muestra = operarios.slice(0, 5);
    if (muestra.length) {
      console.log('Muestra:');
      muestra.forEach((f) => console.log(JSON.stringify(f)));
    }
    console.log('\nImport simulado, no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  console.log(`\n=== IMPORT OPERARIOS: ${path.basename(filePath)} ===`);

  const antes = await contar(client, 'operarios');

  if (operarios.length) {
    await upsertLotes(client, 'operarios', operarios, 'matricula');
    console.log(`operarios: ${operarios.length} filas procesadas`);
  } else {
    console.log('Sin operarios en el CSV.');
  }

  const despues = await contar(client, 'operarios');

  console.log(`\n=== Conteos (antes → despues) ===`);
  console.log(`operarios       : ${antes} → ${despues}`);
  console.log('\nImport completado.');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

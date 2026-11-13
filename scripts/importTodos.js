const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPTS = [
  { nombre: 'importArticulos.js', descripcion: 'Articulos' },
  { nombre: 'importUbicaciones.js', descripcion: 'Ubicaciones' },
  { nombre: 'importOperarios.js', descripcion: 'Operarios' },
];

function normalizarBooleano(t) {
  const v = String(t == null ? '' : t).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'si' || v === 'sí';
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const posicionales = args.filter((a) => !a.startsWith('--'));
  const dryRun = flags.includes('--dry-run');

  if (posicionales.length !== 3) {
    console.error('Uso: node scripts/importTodos.js <articulos.csv> <ubicaciones.csv> <operarios.csv> [--dry-run]');
    process.exit(1);
  }

  const [csvArticulos, csvUbicaciones, csvOperarios] = posicionales.map((p) =>
    path.resolve(process.cwd(), p)
  );

  for (const fp of [csvArticulos, csvUbicaciones, csvOperarios]) {
    if (!require('fs').existsSync(fp)) {
      console.error(`No existe el archivo: ${fp}`);
      process.exit(1);
    }
  }

  const ejecuciones = [
    { script: 'importArticulos.js', csv: csvArticulos },
    { script: 'importUbicaciones.js', csv: csvUbicaciones },
    { script: 'importOperarios.js', csv: csvOperarios },
  ];

  console.log('\n=== IMPORT TODOS (CSV) ===\n');

  let todosOk = true;

  for (const ej of ejecuciones) {
    const args = [ej.csv];
    if (dryRun) args.push('--dry-run');

    console.log(`--- Ejecutando ${ej.script} con ${path.basename(ej.csv)} ---`);

    const resultado = spawnSync('node', [path.resolve(__dirname, ej.script), ...args], {
      stdio: 'inherit',
      encoding: 'utf8',
    });

    if (resultado.status !== 0) {
      console.error(`\n${ej.script} fallo con codigo ${resultado.status}`);
      todosOk = false;
      break;
    }

    console.log('');
  }

  if (todosOk) {
    console.log('=== Todos los imports completaron correctamente ===');
  } else {
    console.error('\n=== Algunos imports fallaron ===');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

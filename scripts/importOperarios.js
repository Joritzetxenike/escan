require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { crearCliente } = require('./lib/supabaseClient');
const { upsertLotes } = require('./lib/upsertLotes');
const { leerCSV, campo } = require('./lib/leerCSV');
const { quitarTildes } = require('./lib/textoSinTildes');

/* =======================================================
 * IMPORT DE OPERARIOS → operarios (matricula, nombre, activo)
 * =======================================================
 *
 * Formatos aceptados:
 *
 *   A) Plantilla propia: MATRICULA, NOMBRE, [ACTIVO]
 *
 *   B) Export de RR. HH. (matriculas.csv):
 *        Empleado ; Nombre ; <sin cabecera>
 *      La matrícula que teclea el operario es la 3ª columna (sin
 *      cabecera), así que se indica con `--matricula-col=3`.
 *
 *   --matricula-col=N   usa la columna N (1-based) como matrícula
 *
 * Si no hay columna ACTIVO, todos se importan como activos
 * (antes un valor ausente contaba como inactivo y nadie podía
 * entrar).
 *
 * Los operarios que ya existen SE ACTUALIZAN (nombre, activo):
 * así un re-import puede dar de baja (ACTIVO=0). No se borra
 * nadie.
 *
 * La app recoge los cambios al arrancar con conexión
 * (RPC `descargar_operarios`).
 * ======================================================= */

const ALIAS = {
  matricula: ['MATRICULA'],
  nombre: ['NOMBRE'],
  activo: ['ACTIVO'],
};

function normalizarBooleano(t) {
  const v = String(t == null ? '' : t).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 's';
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

  const flagCol = flags.find((f) => f.startsWith('--matricula-col='));
  const colMatricula = flagCol ? Number(flagCol.split('=')[1]) : null;

  if (flagCol && !(Number.isInteger(colMatricula) && colMatricula > 0)) {
    console.error('--matricula-col debe ser un número de columna (1, 2, 3...)');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importOperarios.js [ruta.csv] [--matricula-col=N] [--dry-run]');
    process.exit(1);
  }

  const { filas, headers, cabeceraOriginal, separador, codificacion, vacias } =
    await leerCSV(filePath);

  const aliasMatricula = colMatricula ? [`COL${colMatricula}`] : ALIAS.matricula;

  if (!colMatricula && !headers.includes('MATRICULA')) {
    console.error('No hay columna MATRICULA.');
    console.error('Cabeceras leídas:', cabeceraOriginal.map((h, i) => `${i + 1}:"${h}"`).join(' | '));
    console.error('Indica qué columna es la matrícula con --matricula-col=N (para matriculas.csv: --matricula-col=3).');
    process.exit(1);
  }

  if (!headers.includes('NOMBRE')) {
    console.error('No hay columna NOMBRE.');
    console.error('Cabeceras leídas:', cabeceraOriginal.join(' | '));
    process.exit(1);
  }

  const conActivo = headers.includes('ACTIVO');

  const porMatricula = new Map();
  const problemas = [];

  filas.forEach((fila, i) => {
    const numFila = i + 2;
    const matricula = campo(fila, aliasMatricula);
    /* Sin tildes (criterio del proyecto): Ñ → N, Á → A... */
    const nombre = quitarTildes(campo(fila, ALIAS.nombre)).trim();
    const activo = conActivo ? normalizarBooleano(campo(fila, ALIAS.activo)) : true;

    if (!matricula) {
      problemas.push(`Fila ${numFila}: falta la matrícula`);
      return;
    }
    /* La app solo deja teclear dígitos */
    if (!/^\d+$/.test(matricula)) {
      problemas.push(`Fila ${numFila}: matrícula "${matricula}" no es numérica`);
      return;
    }
    if (!nombre) {
      problemas.push(`Fila ${numFila} (${matricula}): falta el nombre`);
      return;
    }
    if (porMatricula.has(matricula)) {
      problemas.push(`Fila ${numFila}: matrícula ${matricula} repetida`);
      return;
    }

    porMatricula.set(matricula, { matricula, nombre, activo });
  });

  const operarios = [...porMatricula.values()];

  console.log(`\n=== ${path.basename(filePath)} ===`);
  console.log(`Separador "${separador === '\t' ? 'TAB' : separador}", codificación ${codificacion}`);
  console.log(`Filas leídas: ${filas.length} (+ ${vacias} vacías ignoradas)`);
  console.log(`Matrícula tomada de: ${colMatricula ? `columna ${colMatricula} ("${cabeceraOriginal[colMatricula - 1] ?? ''}")` : 'MATRICULA'}`);

  if (problemas.length) {
    console.error(`\n=== ${problemas.length} problemas encontrados en el CSV ===`);
    problemas.slice(0, 30).forEach((p) => console.error(' - ' + p));
    console.error('\nAbortando import.');
    process.exit(1);
  }

  const activos = operarios.filter((o) => o.activo).length;
  console.log(`Operarios a importar: ${operarios.length} (activos: ${activos}, inactivos: ${operarios.length - activos})`);
  if (!conActivo) console.log('Sin columna ACTIVO: todos se importan como activos.');

  if (dryRun) {
    console.log('\nMuestra (solo matrícula y longitud del nombre):');
    operarios.slice(0, 5).forEach((o) =>
      console.log(`  ${o.matricula}  nombre de ${o.nombre.length} caracteres  activo=${o.activo}`)
    );
    console.log('\nDRY RUN: no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  const antes = await contar(client, 'operarios');

  await upsertLotes(client, 'operarios', operarios, 'matricula', { actualizar: true });

  const despues = await contar(client, 'operarios');

  console.log(`\noperarios: ${antes} → ${despues}`);
  console.log('\nImport completado.');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

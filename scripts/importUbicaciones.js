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

function unicos(lista, claves) {
  const vistos = new Set();
  const resultado = [];
  for (const item of lista) {
    const key = claves.map((c) => item[c]).join('|');
    if (!vistos.has(key)) {
      vistos.add(key);
      resultado.push(item);
    }
  }
  return resultado;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const posicionales = args.filter((a) => !a.startsWith('--'));
  const filePath = posicionales[0]
    ? path.resolve(process.cwd(), posicionales[0])
    : path.resolve(__dirname, '..', 'ubicaciones.csv');
  const dryRun = flags.includes('--dry-run');

  if (!require('fs').existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importUbicaciones.js [ruta.csv] [--dry-run]');
    process.exit(1);
  }

  const { filas } = await leerCSV(filePath);

  const secciones = [];
  const areas = [];
  const ubicaciones = [];
  const problemas = [];

  filas.forEach((fila, i) => {
    const numFila = i + 2;
    const seccion = normalizarTexto(fila.SECCION);
    const area = normalizarTexto(fila.AREA);
    const subzona = normalizarTexto(fila.SUBZONA);
    const codigo = normalizarTexto(fila.CODIGO);

    if (!seccion || !area || !subzona) {
      problemas.push(`Fila ${numFila}: falta seccion/area/subzona`);
      return;
    }

    const esperado = `${seccion}-${area}-${subzona}`;
    const cod = codigo || esperado;

    secciones.push({ seccion });
    areas.push({ seccion, area });
    ubicaciones.push({
      seccion,
      area,
      subzona,
      codigo: cod,
      stat: STAT_INICIO,
    });
  });

  if (problemas.length) {
    console.error('\n=== Problemas encontrados en el CSV ===');
    problemas.forEach((p) => console.error(' - ' + p));
    console.error('\nAbortando import.');
    process.exit(1);
  }

  const seccionesUnicas = unicos(secciones, ['seccion']);
  const areasUnicas = unicos(areas, ['seccion', 'area']);

  if (dryRun) {
    console.log(`\n=== DRY RUN: ${path.basename(filePath)} ===`);
    console.log(`Secciones a importar: ${seccionesUnicas.length}`);
    console.log(`Areas a importar: ${areasUnicas.length}`);
    console.log(`Ubicaciones a importar: ${ubicaciones.length}`);
    const muestra = ubicaciones.slice(0, 5);
    if (muestra.length) {
      console.log('Muestra:');
      muestra.forEach((f) => console.log(JSON.stringify(f)));
    }
    console.log('\nImport simulado, no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  console.log(`\n=== IMPORT UBICACIONES: ${path.basename(filePath)} ===`);

  const antes = {
    seccion: await contar(client, 'maestroSeccion'),
    area: await contar(client, 'maestroArea'),
    ubicacion: await contar(client, 'maestroUbicacion'),
  };

  if (seccionesUnicas.length) {
    await upsertLotes(
      client,
      'maestroSeccion',
      seccionesUnicas.map((s) => ({ seccion: s.seccion, stat: STAT_INICIO })),
      'seccion'
    );
    console.log(`maestroSeccion: ${seccionesUnicas.length} filas procesadas`);
  } else {
    console.log('Sin secciones en el CSV.');
  }

  if (areasUnicas.length) {
    await upsertLotes(
      client,
      'maestroArea',
      areasUnicas.map((a) => ({
        seccion: a.seccion,
        area: a.area,
        stat: STAT_INICIO,
      })),
      'seccion,area'
    );
    console.log(`maestroArea: ${areasUnicas.length} filas procesadas`);
  } else {
    console.log('Sin areas en el CSV.');
  }

  if (ubicaciones.length) {
    await upsertLotes(
      client,
      'maestroUbicacion',
      ubicaciones,
      'seccion,area,subzona'
    );
    console.log(`maestroUbicacion: ${ubicaciones.length} filas procesadas`);
  } else {
    console.log('Sin ubicaciones en el CSV.');
  }

  const despues = {
    seccion: await contar(client, 'maestroSeccion'),
    area: await contar(client, 'maestroArea'),
    ubicacion: await contar(client, 'maestroUbicacion'),
  };

  console.log(`\n=== Conteos (antes → despues) ===`);
  console.log(`maestroSeccion  : ${antes.seccion} → ${despues.seccion}`);
  console.log(`maestroArea     : ${antes.area} → ${despues.area}`);
  console.log(`maestroUbicacion: ${antes.ubicacion} → ${despues.ubicacion}`);
  console.log('\nImport completado.');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

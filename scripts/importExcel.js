require('dotenv').config();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const DEFAULT_FILE = path.resolve(__dirname, '..', 'excelQR.xlsx');
const TEMPLATE_FILE = path.resolve(__dirname, '..', 'plantilla_import.xlsx');
const BATCH_SIZE = 500;
const STAT_INICIO = 'Inicio';

function normalizarTexto(t) {
  return String(t == null ? '' : t)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarHeaders(headers) {
  return headers.map(normalizarTexto);
}

function construirMapa(headers) {
  const mapa = {};
  headers.forEach((original, i) => {
    const n = normalizarTexto(original);
    if (n) mapa[n] = i;
  });
  return mapa;
}

function tipoDeHoja(headers) {
  const h = normalizarHeaders(headers);
  const tiene = (...keys) => keys.every((k) => h.includes(k));
  if (tiene('SECCION', 'AREA', 'SUBZONA')) return 'ubicaciones';
  if (tiene('ITEM', 'DSCA')) return 'articulos';
  return null;
}

function normalizar(valor) {
  return String(valor == null ? '' : valor).trim().toUpperCase();
}

function valorDe(fila, mapa, key) {
  const i = mapa[key];
  if (i === undefined) return '';
  return fila[i] == null ? '' : fila[i];
}

function leerUbicaciones(sheet) {
  const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = (filas[0] || []).map((h) => String(h == null ? '' : h));
  const mapa = construirMapa(headers);
  const ubicaciones = [];
  const problemas = [];

  filas.slice(1).forEach((fila, i) => {
    const seccion = normalizar(valorDe(fila, mapa, 'SECCION'));
    const area = normalizar(valorDe(fila, mapa, 'AREA'));
    const subzona = normalizar(valorDe(fila, mapa, 'SUBZONA'));
    const codigo = normalizar(valorDe(fila, mapa, 'CODIGO'));

    if (!seccion || !area || !subzona) {
      problemas.push(`Fila ${i + 2}: falta seccion/area/subzona`);
      return;
    }

    const esperado = `${seccion}-${area}-${subzona}`;
    const numFila = i + 2;
    if (codigo && codigo !== esperado) {
      problemas.push(
        `Fila ${numFila}: CÓDIGO "${codigo}" no coincide con "${esperado}"`
      );
      return;
    }

    ubicaciones.push({ seccion, area, subzona });
  });

  return { ubicaciones, problemas };
}

function leerArticulos(sheet) {
  const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = (filas[0] || []).map((h) => String(h == null ? '' : h));
  const mapa = construirMapa(headers);
  const articulos = [];
  const problemas = [];

  filas.slice(1).forEach((fila, i) => {
    const item = normalizar(valorDe(fila, mapa, 'ITEM'));
    const dsca = normalizar(valorDe(fila, mapa, 'DSCA'));
    const tipo = normalizar(valorDe(fila, mapa, 'TIPO'));

    const numFila = i + 2;
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
    articulos.push(row);
  });

  return { articulos, problemas };
}

function identificarHojas(wb) {
  const resultado = { ubicaciones: [], articulos: [] };
  for (const nombre of wb.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombre], {
      header: 1,
      defval: '',
    });
    const headers = filas[0] || [];
    const tipo = tipoDeHoja(headers);
    if (tipo === 'ubicaciones') resultado.ubicaciones.push(wb.Sheets[nombre]);
    if (tipo === 'articulos') resultado.articulos.push(wb.Sheets[nombre]);
  }
  return resultado;
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

function generarTemplate() {
  const wb = XLSX.utils.book_new();

  const ubicaciones = XLSX.utils.aoa_to_sheet([
    ['SECCIÓN', 'ÁREA', 'SUBZONA', 'CÓDIGO', 'UNIDADES', 'QR'],
    ['LIN2', 'A00', 'Z01', 'LIN2-A00-Z01', 1, ''],
    ['LIN2', 'A01', 'Z01', 'LIN2-A01-Z01', 1, ''],
    ['CARP', 'A00', 'Z01', 'CARP-A00-Z01', 1, ''],
  ]);
  ubicaciones['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ubicaciones, 'Datos QR');

  const articulos = XLSX.utils.aoa_to_sheet([
    ['ITEM', 'DSCA', 'TIPO'],
    ['1234567890123', 'Ejemplo de artículo', 'SIC'],
    ['9876543210987', 'Otro artículo', ''],
  ]);
  articulos['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, articulos, 'Articulos');

  XLSX.writeFile(wb, TEMPLATE_FILE);
  console.log(`Plantilla generada: ${TEMPLATE_FILE}`);
}

function crearCliente() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!url) throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL');
  if (!serviceKey && !anonKey) throw new Error('Falta clave de Supabase');

  if (!serviceKey) {
    console.warn(
      'AVISO: usando anon key. Si las inserciones fallan por RLS, define SUPABASE_SERVICE_ROLE_KEY en .env'
    );
  }

  return createClient(url, serviceKey || anonKey);
}

async function contar(client, tabla) {
  const { count, error } = await client
    .from(tabla)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

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

function imprimirPreview(nombre, filas, limites) {
  console.log(`\n--- ${nombre} (${filas.length} filas) ---`);
  console.log(`Secciones: ${limites.secciones.length}`);
  console.log(`Áreas: ${limites.areas.length}`);
  console.log(`Ubicaciones: ${limites.ubicaciones.length}`);
  const muestra = filas.slice(0, 5);
  if (muestra.length) {
    console.log('Muestra:');
    muestra.forEach((f) => console.log(JSON.stringify(f)));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const posicionales = args.filter((a) => !a.startsWith('--'));
  const filePath = posicionales[0] ? path.resolve(process.cwd(), posicionales[0]) : DEFAULT_FILE;
  const dryRun = flags.includes('--dry-run');
  const template = flags.includes('--template');

  if (template) {
    generarTemplate();
    return;
  }

  if (!require('fs').existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importExcel.js [ruta.xlsx] [--dry-run] [--template]');
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const hojas = identificarHojas(wb);

  if (!hojas.ubicaciones.length && !hojas.articulos.length) {
    console.error('No se encontró ninguna hoja reconocible.');
    process.exit(1);
  }

  let ubicaciones = [];
  let articulos = [];
  const problemas = [];

  for (const sheet of hojas.ubicaciones) {
    const r = leerUbicaciones(sheet);
    ubicaciones = ubicaciones.concat(r.ubicaciones);
    problemas.push(...r.problemas);
  }
  for (const sheet of hojas.articulos) {
    const r = leerArticulos(sheet);
    articulos = articulos.concat(r.articulos);
    problemas.push(...r.problemas);
  }

  const secciones = unicos(ubicaciones, ['seccion']);
  const areas = unicos(ubicaciones, ['seccion', 'area']);

  if (problemas.length) {
    console.error('\n=== Problemas encontrados en el Excel ===');
    problemas.forEach((p) => console.error(' - ' + p));
    console.error('\nAbortando import.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n=== DRY RUN: ${path.basename(filePath)} ===`);
    if (ubicaciones.length) imprimirPreview('UBICACIONES', ubicaciones, { secciones, areas, ubicaciones });
    if (articulos.length) {
      console.log(`\n--- ARTICULOS (${articulos.length} filas) ---`);
      articulos.slice(0, 5).forEach((f) => console.log(JSON.stringify(f)));
    }
    console.log('\nImport simulado, no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  console.log(`\n=== IMPORT: ${path.basename(filePath)} ===`);

  const antes = {
    seccion: await contar(client, 'maestroSeccion'),
    area: await contar(client, 'maestroArea'),
    ubicacion: await contar(client, 'maestroUbicacion'),
    articulo: await contar(client, 'maestroArticulo'),
  };

  if (ubicaciones.length) {
    await upsertLotes(client, 'maestroSeccion', secciones.map((s) => ({ seccion: s.seccion, stat: STAT_INICIO })), 'seccion');
    console.log(`maestroSeccion: ${secciones.length} filas procesadas`);
    await upsertLotes(client, 'maestroArea', areas.map((a) => ({ seccion: a.seccion, area: a.area, stat: STAT_INICIO })), 'seccion,area');
    console.log(`maestroArea: ${areas.length} filas procesadas`);
    await upsertLotes(client, 'maestroUbicacion', ubicaciones.map((u) => ({ ...u, stat: STAT_INICIO })), 'seccion,area,subzona');
    console.log(`maestroUbicacion: ${ubicaciones.length} filas procesadas`);
  } else {
    console.log('Sin ubicaciones en el Excel.');
  }

  if (articulos.length) {
    await upsertLotes(client, 'maestroArticulo', articulos, 'item');
    console.log(`maestroArticulo: ${articulos.length} filas procesadas`);
  } else {
    console.log('Sin hoja de artículos en el Excel: maestroArticulo sin cambios.');
  }

  const despues = {
    seccion: await contar(client, 'maestroSeccion'),
    area: await contar(client, 'maestroArea'),
    ubicacion: await contar(client, 'maestroUbicacion'),
    articulo: await contar(client, 'maestroArticulo'),
  };

  console.log('\n=== Conteos (antes → después) ===');
  console.log(`maestroSeccion  : ${antes.seccion} → ${despues.seccion}`);
  console.log(`maestroArea     : ${antes.area} → ${despues.area}`);
  console.log(`maestroUbicacion: ${antes.ubicacion} → ${despues.ubicacion}`);
  console.log(`maestroArticulo : ${antes.articulo} → ${despues.articulo}`);
  console.log('\nImport completado.');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});
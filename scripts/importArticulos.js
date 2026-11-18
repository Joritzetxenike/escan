require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { crearCliente } = require('./lib/supabaseClient');
const { upsertLotes } = require('./lib/upsertLotes');
const { leerCSV, campo } = require('./lib/leerCSV');
const { quitarTildes, crearReparador } = require('./lib/textoSinTildes');

/* =======================================================
 * IMPORT DE ARTÍCULOS → maestroArticulo (item, dsca, tipo, unit)
 * =======================================================
 *
 * Formatos aceptados (cabeceras normalizadas por leerCSV):
 *
 *   A) Plantilla propia: ITEM, DSCA, TIPO, [UNIDAD|UNIT]
 *      `TIPO` se usa tal cual.
 *
 *   B) Export del ERP (maestroTratado.csv):
 *      Artículo; Descripción; Tipo artículo; Ud. stock; Mét.plan.
 *      El tipo se DEDUCE:
 *        - Tipo artículo = Genérico        → GEN
 *        - si no, Mét.plan. = MRP | SIC    → MRP | SIC
 *        - si no, Mét.plan. = Manual       → NO se importa
 *      (Un genérico con Mét.plan. Manual se importa como GEN:
 *       así la app lo rechaza diciendo que es genérico, en vez de
 *       decir que no existe.)
 *      La 6ª columna sin cabecera del export se ignora.
 *
 * Los códigos se guardan tal cual (solo sin espacios de los
 * extremos): distinguen mayúsculas y pueden llevar espacios
 * internos (`-BXC05.4010 -SUB`).
 *
 * Descripciones SIN TILDES (criterio del proyecto): se quitan los
 * acentos y se reparan las letras que el export cambió por `?`
 * (`Z?CALO` → `ZOCALO`), ver `lib/textoSinTildes.js`. Los `?` que
 * son símbolos junto a números (Ø12, 20º) se dejan.
 *
 * Los artículos que ya existen SE ACTUALIZAN (dsca, tipo, unit).
 * No se borra nada: un artículo que ya no está en el CSV, o que
 * ahora es Manual, sigue en la tabla.
 * ======================================================= */

const TIPOS_VALIDOS = new Set(['MRP', 'SIC', 'GEN']);

const ALIAS = {
  item: ['ITEM', 'ARTICULO', 'ARTULO'],
  dsca: ['DSCA', 'DESCRIPCION', 'DESCRIPCI'],
  tipo: ['TIPO'],
  tipoArticulo: ['TIPOARTICULO', 'TIPOARTULO'],
  metodo: ['METPLAN', 'MPLAN', 'METODOPLANIFICACION', 'METODO'],
  unit: ['UNIT', 'UNIDAD', 'UDSTOCK', 'UD'],
};

const mayus = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();

/** Devuelve `{ tipo }`, `{ omitir: motivo }` o `{ error }`. */
function deducirTipo(fila, formato) {
  if (formato === 'plantilla') {
    const tipo = mayus(campo(fila, ALIAS.tipo));
    if (!tipo) return { tipo: null };
    if (!TIPOS_VALIDOS.has(tipo)) return { error: `TIPO "${tipo}" no válido (MRP, SIC o GEN)` };
    return { tipo };
  }

  const tipoArticulo = mayus(campo(fila, ALIAS.tipoArticulo));
  const metodo = mayus(campo(fila, ALIAS.metodo));

  if (tipoArticulo.startsWith('GEN')) return { tipo: 'GEN' };
  if (metodo === 'MRP' || metodo === 'SIC') return { tipo: metodo };
  if (metodo === 'MANUAL') return { omitir: 'manual' };

  return { error: `no se puede deducir el tipo (Tipo artículo "${tipoArticulo}", Mét.plan. "${metodo}")` };
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

  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    console.error('Uso: node scripts/importArticulos.js [ruta.csv] [--dry-run]');
    process.exit(1);
  }

  const { filas, headers, cabeceraOriginal, separador, codificacion, vacias } =
    await leerCSV(filePath);

  const tiene = (alias) => alias.some((a) => headers.includes(a));

  if (!tiene(ALIAS.item)) {
    console.error('No se encuentra la columna del código (ITEM o Artículo).');
    console.error('Cabeceras leídas:', cabeceraOriginal.join(' | '));
    process.exit(1);
  }

  const formato = tiene(ALIAS.tipo) ? 'plantilla' : 'erp';

  if (formato === 'erp' && !tiene(ALIAS.tipoArticulo) && !tiene(ALIAS.metodo)) {
    console.error('No hay columna TIPO ni "Tipo artículo"/"Mét.plan." para deducirlo.');
    console.error('Cabeceras leídas:', cabeceraOriginal.join(' | '));
    process.exit(1);
  }

  const conUnit = tiene(ALIAS.unit);

  const reparar = crearReparador(filas.map((f) => campo(f, ALIAS.dsca)));
  let reparadas = 0;
  const pendientesDsca = new Map();

  const porItem = new Map();
  const problemas = [];
  const omitidos = { manual: 0 };
  let duplicados = 0;
  let sinDescripcion = 0;

  filas.forEach((fila, i) => {
    const numFila = i + 2;
    const item = campo(fila, ALIAS.item);

    if (!item) {
      problemas.push(`Fila ${numFila}: falta el código del artículo`);
      return;
    }

    const deducido = deducirTipo(fila, formato);

    if (deducido.error) {
      problemas.push(`Fila ${numFila} (${item}): ${deducido.error}`);
      return;
    }

    if (deducido.omitir) {
      omitidos[deducido.omitir] += 1;
      return;
    }

    const { texto, cambios, pendientes } = reparar(campo(fila, ALIAS.dsca));
    if (cambios.length) reparadas += 1;
    pendientes.forEach((p) => pendientesDsca.set(p, (pendientesDsca.get(p) ?? 0) + 1));

    let dsca = quitarTildes(texto).trim();
    if (!dsca) {
      /* `dsca` es NOT NULL en la tabla */
      dsca = '-';
      sinDescripcion += 1;
    }

    const row = { item, dsca, tipo: deducido.tipo };

    if (conUnit) {
      row.unit = mayus(campo(fila, ALIAS.unit)) || null;
    }

    /* Un mismo código dos veces en el lote hace fallar el upsert
       entero ("ON CONFLICT ... cannot affect row a second time"):
       se queda la última aparición. */
    if (porItem.has(item)) duplicados += 1;
    porItem.set(item, row);
  });

  const articulos = [...porItem.values()];

  console.log(`\n=== ${path.basename(filePath)} ===`);
  console.log(`Formato: ${formato === 'erp' ? 'export del ERP (tipo deducido)' : 'plantilla (columna TIPO)'}`);
  console.log(`Separador "${separador === '\t' ? 'TAB' : separador}", codificación ${codificacion}`);
  console.log(`Filas leídas: ${filas.length} (+ ${vacias} vacías ignoradas)`);

  if (problemas.length) {
    console.error(`\n=== ${problemas.length} problemas encontrados en el CSV ===`);
    problemas.slice(0, 30).forEach((p) => console.error(' - ' + p));
    if (problemas.length > 30) console.error(` ... y ${problemas.length - 30} más`);
    console.error('\nAbortando import.');
    process.exit(1);
  }

  const porTipo = {};
  articulos.forEach((a) => {
    porTipo[a.tipo ?? '(sin tipo)'] = (porTipo[a.tipo ?? '(sin tipo)'] ?? 0) + 1;
  });

  console.log(`Artículos a importar: ${articulos.length}`);
  Object.entries(porTipo).forEach(([t, n]) => console.log(`  ${t.padEnd(10)} ${n}`));
  console.log(`Omitidos por Mét.plan. Manual: ${omitidos.manual}`);
  if (duplicados) console.log(`Códigos repetidos (se usa la última fila): ${duplicados}`);
  if (sinDescripcion) console.log(`Sin descripción (se guarda "-"): ${sinDescripcion}`);
  if (!conUnit) console.log('Sin columna de unidad: no se toca `unit`.');
  console.log(`Descripciones con letras recuperadas (? → sin tilde): ${reparadas}`);
  if (pendientesDsca.size) {
    console.log(`Palabras que siguen con "?" (no se pudieron deducir): ${[...pendientesDsca.keys()].slice(0, 15).join(', ')}`);
  }

  if (dryRun) {
    console.log('\nMuestra:');
    articulos.slice(0, 5).forEach((f) => console.log('  ' + JSON.stringify(f)));
    console.log('\nDRY RUN: no se escribió nada en la base de datos.');
    return;
  }

  const client = crearCliente();

  const antes = await contar(client, 'maestroArticulo');

  await upsertLotes(client, 'maestroArticulo', articulos, 'item', {
    actualizar: true,
    alProgresar: (n, total) => process.stdout.write(`\r  enviados ${n}/${total}`),
  });
  console.log('');

  const despues = await contar(client, 'maestroArticulo');

  console.log(`\nmaestroArticulo: ${antes} → ${despues} (nuevos: ${despues - antes}, actualizados: ${articulos.length - (despues - antes)})`);
  console.log('\nImport completado. Recuerda actualizar la copia del maestro en los móviles (icono ⟳).');
}

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});

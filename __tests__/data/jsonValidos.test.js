/* =====================================================
 * JSON EMPAQUETADOS EN LA APP
 * =====================================================
 *
 * Los tests de login mockean `operariosHelper`, así que nunca
 * cargan el `operarios.json` real. El commit 1b6a1e4 dejó pasar así
 * un comentario `/* *\/` dentro del JSON: Metro no puede
 * empaquetarlo y la build/OTA falla. Este test lee los
 * ficheros tal cual están en disco, sin mocks.
 * ===================================================== */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');

const buscarJson = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return buscarJson(ruta);
    return e.name.endsWith('.json') ? [ruta] : [];
  });

const ficheros = [
  ...buscarJson(path.join(RAIZ, 'src')),
  path.join(RAIZ, 'app.json'),
  path.join(RAIZ, 'eas.json'),
  path.join(RAIZ, 'package.json'),
];

describe('JSON de la app', () => {

  test.each(ficheros.map((f) => [path.relative(RAIZ, f)]))(
    '%s es JSON estricto',
    (relativo) => {
      const contenido = fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
      expect(() => JSON.parse(contenido)).not.toThrow();
    }
  );

  test('operarios.json es una lista sin operarios de prueba', () => {
    const operarios = require('../../src/data/operarios.json');

    /* Los operarios reales vienen de Supabase (RPC
       descargar_operarios). La plantilla puede ir vacía. */
    expect(Array.isArray(operarios)).toBe(true);
    expect(operarios.map((o) => o.matricula)).not.toEqual(
      expect.arrayContaining(['00123'])
    );
    expect(operarios.map((o) => o.matricula)).not.toEqual(
      expect.arrayContaining(['00456'])
    );

    operarios.forEach((op) => {
      expect(typeof op.matricula).toBe('string');
      expect(typeof op.nombre).toBe('string');
      expect(typeof op.activo).toBe('boolean');
    });
  });

});

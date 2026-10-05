/* Comprueba que importar el cliente sin configuración no
 * revienta el bundle, que era justo lo que dejaba la app en
 * pantalla blanca en la 1.0.5.
 *
 * Cada test aísla el módulo con `jest.resetModules()` y vuelve
 * a importarlo, porque `configError` se calcula al cargar el
 * archivo con las variables que haya en ese momento. */

const URL_VALIDA = 'https://ejemplo.supabase.co';
const KEY_VALIDA = 'sb_publishable_clave_de_prueba';

const conVariables = (variables) => {
  const original = {};

  Object.keys(variables).forEach((clave) => {
    original[clave] = process.env[clave];

    /* `process.env.X = undefined` asigna el texto "undefined",
     * que además es verdadero: hay que borrar la variable. */
    if (variables[clave] === undefined) {
      delete process.env[clave];
    } else {
      process.env[clave] = variables[clave];
    }
  });

  jest.resetModules();

  return {
    mod: require('../../src/providers/supabase/supabaseClient'),
    restaurar: () => {
      Object.keys(variables).forEach((clave) => {
        if (original[clave] === undefined) delete process.env[clave];
        else process.env[clave] = original[clave];
      });
      jest.resetModules();
    },
  };
};

describe('Cliente de Supabase sin configuración', () => {

  test('no lanza al importarse si faltan las variables', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });

    try {
      expect(mod.default).toBeDefined();
    } finally {
      restaurar();
    }
  });

  test('describe qué variable falta', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: URL_VALIDA,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });

    try {
      expect(mod.configError).toContain('EXPO_PUBLIC_SUPABASE_KEY');
      expect(mod.configError).not.toContain('EXPO_PUBLIC_SUPABASE_URL');
    } finally {
      restaurar();
    }
  });

  test('avisa de las dos si no hay ninguna', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });

    try {
      expect(mod.configError).toContain('EXPO_PUBLIC_SUPABASE_URL');
      expect(mod.configError).toContain('EXPO_PUBLIC_SUPABASE_KEY');
    } finally {
      restaurar();
    }
  });

  test('falla al usarse, no antes, con mensaje legible', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });

    try {
      expect(() => mod.default.from('conteo')).toThrow(
        /EXPO_PUBLIC_SUPABASE/
      );

      expect(() => mod.default.rpc('funcion')).toThrow(
        /EXPO_PUBLIC_SUPABASE/
      );
    } finally {
      restaurar();
    }
  });

  test('sin configuración no se intenta crear un cliente real', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_KEY: undefined,
    });

    try {
      expect(mod.configError).not.toBeNull();
    } finally {
      restaurar();
    }
  });

});

describe('Cliente de Supabase con configuración válida', () => {

  test('no reporta error de configuración', () => {
    const { mod, restaurar } = conVariables({
      EXPO_PUBLIC_SUPABASE_URL: URL_VALIDA,
      EXPO_PUBLIC_SUPABASE_KEY: KEY_VALIDA,
    });

    try {
      expect(mod.configError).toBeNull();
      expect(mod.default.from).toBeInstanceOf(Function);
    } finally {
      restaurar();
    }
  });

});
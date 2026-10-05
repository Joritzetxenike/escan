import React from 'react';
import { create, act } from 'react-test-renderer';

/* Sin configuración, la app no debe reventar al arrancar:
 * debe mostrar el aviso. Este es el escenario de la 1.0.5
 * (bundle sin variables de Supabase), donde antes salía una
 * pantalla blanca sin más pista.
 *
 * `Main` se sustituye por un texto: lo que se prueba aquí es
 * la decisión de `App`, no el interior de la app. */

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../Main', () => ({
  __esModule: true,
  default: () => {
    const { Text } = require('react-native');
    return <Text testID="main">Main</Text>;
  },
}));

/* Monta `App` con las variables indicadas y devuelve el árbol.
 * Restaura el entorno al terminar, también si el render falla. */

const montarConConfig = (url, key) => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = url;

  if (key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_KEY = key;

  jest.resetModules();

  let arbol;

  try {
    /* `resetModules` vacía el registro, así que el `React` de
     * arriba ya no es el mismo que usa `App`. Si el elemento se
     * creara con la copia antigua, no renderizaría. Por eso se
     * vuelve a pedir React aquí, ya con la configuración puesta. */
    const React = require('react');
    const { create, act } = require('react-test-renderer');
    const App = require('../App').default;

    act(() => {
      arbol = create(React.createElement(App));
    });
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_KEY = originalKey;
  }

  return arbol;
};

/* `root.findByProps({ testID })` lanza si no encuentra nada, que
 * es justo lo que se quiere comprobar. */

const porTestId = (arbol, testID) => arbol.root.findByProps({ testID });

describe('App sin configuración de Supabase', () => {

  test('monta sin lanzar y muestra el aviso', () => {
    const arbol = montarConConfig(undefined, undefined);

    expect(porTestId(arbol, 'pantalla-error')).toBeTruthy();
    expect(porTestId(arbol, 'aviso-config')).toBeTruthy();
  });

  test('no monta Main cuando la configuración falla', () => {
    const arbol = montarConConfig(undefined, undefined);

    expect(arbol.root.findAllByProps({ testID: 'main' })).toHaveLength(0);
  });

  test('el aviso dice qué variable falta', () => {
    const arbol = montarConConfig(undefined, undefined);

    const texto = JSON.stringify(arbol.toJSON());

    expect(texto).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(texto).toContain('EXPO_PUBLIC_SUPABASE_KEY');
  });

  test('señala solo la que falta cuando hay URL pero no key', () => {
    const arbol = montarConConfig('https://ejemplo.supabase.co', undefined);

    /* Solo se mira el mensaje con las variables que faltan: el
     * texto explicativo de debajo las nombra a las dos. */
    const faltan = porTestId(arbol, 'aviso-config-faltan');

    expect(faltan.props.children).toContain('EXPO_PUBLIC_SUPABASE_KEY');
    expect(faltan.props.children).not.toContain('EXPO_PUBLIC_SUPABASE_URL');
  });

});

describe('App con configuración válida', () => {

  test('monta Main y no muestra el aviso', () => {
    const arbol = montarConConfig(
      'https://ejemplo.supabase.co',
      'sb_publishable_clave_de_prueba'
    );

    expect(porTestId(arbol, 'main')).toBeTruthy();
    expect(arbol.root.findAllByProps({ testID: 'aviso-config' })).toHaveLength(0);
  });

});
import React from 'react';
import { create, act } from 'react-test-renderer';

import IdentificacionScreen from '../../src/screens/IdentificacionScreen';
import { AuthProvider } from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/components/EstadoBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ soloAvisos }) => React.createElement(
    Text,
    { testID: 'estado-banner' },
    soloAvisos ? 'Solo avisos' : 'Sincronizado'
  );
});

jest.mock('../../src/components/MaestrosBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return () => React.createElement(
    Text,
    { testID: 'maestros-banner' },
    'Maestros'
  );
});

describe('IdentificacionScreen', () => {

  let renderer;

  const montar = async () => {
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <IdentificacionScreen />
        </AuthProvider>
      );
    });
  };

  const escribir = async (valor) => {
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'input-matricula' })
        .props.onChangeText(valor);
    });
  };

  const entrar = async () => {
    await act(async () => {
      await renderer.root
        .findByProps({ testID: 'btn-entrar' })
        .props.onPress();
    });
  };

  afterEach(() => {
    authService.cerrarSesion();
  });

  test('solo conserva los dígitos tecleados', async () => {
    await montar();

    await escribir('00a-12 34');

    expect(
      renderer.root
        .findByProps({ testID: 'input-matricula' })
        .props.value
    ).toBe('001234');
  });

  test('avisa si se intenta entrar sin matrícula', async () => {
    await montar();

    await entrar();

    expect(
      renderer.root.findAllByProps({ testID: 'error-matricula' })
    ).not.toHaveLength(0);

    expect(authService.haySesion()).toBe(false);
  });

  test('inicia sesión con una matrícula válida', async () => {
    await montar();

    await escribir('00123');
    await entrar();

    expect(authService.obtenerMatricula()).toBe('00123');
    expect(
      renderer.root.findAllByProps({ testID: 'error-matricula' })
    ).toHaveLength(0);
  });

  test('muestra la copia del maestro arriba del formulario', async () => {
    await montar();

    const texto = JSON.stringify(renderer.toJSON());

    expect(
      renderer.root.findAllByProps({ testID: 'maestros-banner' })
    ).not.toHaveLength(0);

    expect(texto.indexOf('maestros-banner')).toBeLessThan(
      texto.indexOf('InventoryScanner')
    );
  });

  test('deja el banner de conexión en modo solo avisos', async () => {
    await montar();

    const texto = JSON.stringify(renderer.toJSON());

    expect(texto).toContain('Solo avisos');

    expect(texto).not.toContain('Sincronizado');
  });

  test('ordena la copia antes de los avisos de conexión', async () => {
    await montar();

    const texto = JSON.stringify(renderer.toJSON());

    expect(texto.indexOf('maestros-banner')).toBeLessThan(
      texto.indexOf('estado-banner')
    );

    expect(texto.indexOf('estado-banner')).toBeLessThan(
      texto.indexOf('InventoryScanner')
    );
  });

});

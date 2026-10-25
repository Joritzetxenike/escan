import React from 'react';
import { create, act } from 'react-test-renderer';

import HeaderTabs from '../../src/components/HeaderTabs';
import { AuthProvider } from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

describe('HeaderTabs', () => {

  let renderer;

  const montar = async () => {
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <HeaderTabs titulo="Inicio" />
        </AuthProvider>
      );
    });
  };

  beforeEach(() => {
    authService.iniciarSesion('00123');
  });

  afterEach(() => {
    authService.cerrarSesion();
  });

  test('muestra el título de la pestaña', async () => {
    await montar();

    expect(JSON.stringify(renderer.toJSON())).toContain('Inicio');
  });

  test('muestra la matrícula y el botón de cerrar sesión', async () => {
    await montar();

    const texto = JSON.stringify(renderer.toJSON());

    expect(texto).toContain('00123');
    expect(texto).toContain('btn-cerrar-sesion');
  });

});

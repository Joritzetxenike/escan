import React from 'react';
import { Alert } from 'react-native';
import { create, act } from 'react-test-renderer';

import HeaderSesion from '../../src/components/HeaderSesion';
import { AuthProvider } from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

describe('HeaderSesion', () => {

  let renderer;
  let alertSpy;

  const montar = async () => {
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <HeaderSesion />
        </AuthProvider>
      );
    });
  };

  beforeEach(() => {
    authService.iniciarSesion('00123');
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    authService.cerrarSesion();
    alertSpy.mockRestore();
  });

  test('muestra la matrícula de la sesión', async () => {
    await montar();

    const texto = JSON.stringify(renderer.toJSON());

    expect(texto).toContain('00123');
  });

  test('pide confirmación antes de cerrar sesión', async () => {
    await montar();

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'btn-cerrar-sesion' })
        .props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Cerrar sesión',
      expect.stringContaining('00123'),
      expect.any(Array)
    );

    expect(authService.haySesion()).toBe(true);
  });

  test('cerrar sesión al confirmar el aviso', async () => {
    await montar();

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'btn-cerrar-sesion' })
        .props.onPress();
    });

    const botones = alertSpy.mock.calls[0][2];
    const confirmar = botones.find(
      (boton) => boton.text === 'Cerrar sesión'
    );

    await act(async () => {
      confirmar.onPress();
    });

    expect(authService.haySesion()).toBe(false);
  });

});

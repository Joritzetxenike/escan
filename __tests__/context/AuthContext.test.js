import React from 'react';
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';

import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

describe('AuthContext', () => {

  let api;
  let renderer;

  const Probe = () => {
    api = useAuth();

    return (
      <Text testID="matricula">
        {api.matricula ?? 'sin-sesion'}
      </Text>
    );
  };

  const montar = async () => {
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });
  };

  const texto = () =>
    renderer.root.findByProps({ testID: 'matricula' })
      .props.children;

  afterEach(() => {
    authService.cerrarSesion();
  });

  test('empieza sin sesión', async () => {
    await montar();

    expect(texto()).toBe('sin-sesion');
    expect(api.identificado).toBe(false);
  });

  test('identifica con una matrícula numérica', async () => {
    await montar();

    await act(async () => {
      await api.identificar('00123');
    });

    expect(texto()).toBe('00123');
    expect(api.identificado).toBe(true);
    expect(authService.obtenerMatricula()).toBe('00123');
  });

  test('no identifica con una matrícula vacía', async () => {
    await montar();

    let resultado;

    await act(async () => {
      resultado = await api.identificar('   ');
    });

    expect(resultado.valida).toBe(false);
    expect(texto()).toBe('sin-sesion');
    expect(api.identificado).toBe(false);
  });

  test('cerrar sesión vuelve al estado inicial', async () => {
    await montar();

    await act(async () => {
      await api.identificar('1234');
    });

    await act(async () => {
      api.cerrarSesion();
    });

    expect(texto()).toBe('sin-sesion');
    expect(api.identificado).toBe(false);
    expect(authService.obtenerMatricula()).toBeNull();
  });

});

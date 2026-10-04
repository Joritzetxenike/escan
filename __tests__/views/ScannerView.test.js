import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

import ScannerView from '../../src/views/ScannerView';

/* La cámara real no existe en el test: se sustituye por una
   vista que expone `enableTorch` para poder comprobar que la
   vista se lo pasa. */
jest.mock('expo-camera', () => ({
  CameraView: (props) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: 'camera',
      enableTorch: props.enableTorch,
    });
  },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

describe('ScannerView', () => {

  let renderer;

  const dataState = {
    permission: { granted: true },
    tipo: 'articulo',
    hintText: 'Escanea un artículo',
    flashActivo: false,
    soportaFlash: true,
  };

  const dataActions = {
    handleBarcodeScanned: jest.fn(),
    volver: jest.fn(),
    toggleFlash: jest.fn(),
    requestPermission: jest.fn(),
  };

  const textoDe = (nodo) => {
    const children = nodo.props.children;
    return Array.isArray(children) ? children.join('') : children;
  };

  const montar = (estado = {}, acciones = {}) => {
    act(() => {
      renderer = create(
        <ScannerView
          state={{ ...dataState, ...estado }}
          actions={{ ...dataActions, ...acciones }}
        />
      );
    });

    return renderer;
  };

  const camara = () =>
    renderer.root.findByProps({ testID: 'camera' })
      .props.enableTorch;

  const botonFlash = () =>
    renderer.root.findAllByProps({
      testID: 'btn-flash',
    })[0];

  const iconoFlash = () => {
    const textos = renderer.root.findAllByType(Text);

    return textos.find((t) =>
      ['flash-on', 'flash-off'].includes(
        String(textoDe(t))
      )
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });


  // =====================================================
  // FLASH
  // =====================================================
  //
  // expo-camera no tiene forma de preguntar si el móvil
  // lleva flash, así que la vista solo se guía por lo que
  // le dice la plataforma. Lo que sí se comprueba aquí es
  // que el botón existe, conmuta y le pasa el estado a la
  // cámara.

  describe('flash', () => {

    test('la cámara empieza con el flash apagado', () => {
      montar({ flashActivo: false });

      expect(camara()).toBe(false);
    });

    test('enciende el flash de la cámara', () => {
      montar({ flashActivo: true });

      expect(camara()).toBe(true);
    });

    test('muestra el botón para encenderlo', () => {
      montar({ flashActivo: false });

      expect(botonFlash()).toBeTruthy();
      expect(String(textoDe(iconoFlash())))
        .toBe('flash-off');
    });

    test('al pulsarlo pide cambiar el estado', () => {
      const toggleFlash = jest.fn();

      montar({ flashActivo: false }, { toggleFlash });

      act(() => {
        botonFlash().props.onPress();
      });

      expect(toggleFlash).toHaveBeenCalledTimes(1);
    });

    test('el icono y la etiqueta cambian al encenderlo', () => {
      montar({ flashActivo: true });

      expect(String(textoDe(iconoFlash())))
        .toBe('flash-on');

      expect(
        botonFlash().props.accessibilityLabel
      ).toBe('Apagar el flash');
    });

    test('la etiqueta apagada dice que lo va a encender', () => {

      montar({ flashActivo: false });

      expect(
        botonFlash().props.accessibilityLabel
      ).toBe('Encender el flash');

    });

    test('no lo ofrece si la plataforma no lo soporta', () => {

      /* En web el botón sería un adorno que no hace nada,
         así que no se pinta. */

      montar({ soportaFlash: false });

      expect(botonFlash()).toBeUndefined();
    });

    test('tampoco lo ofrece sin permiso de cámara', () => {

      /* Sin permiso la vista vuelve antes de la cámara, así
         que el botón no debe quedar por ahí pulsable. */

      montar({ permission: { granted: false } });

      expect(botonFlash()).toBeUndefined();

    });

  });

});
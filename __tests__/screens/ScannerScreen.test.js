import React from 'react';
import { create, act } from 'react-test-renderer';

import ScannerScreen from '../../src/screens/ScannerScreen';

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: jest.fn(() => [null]),
}));

/* La vista del escáner usa iconos; sin este mock,
   `@expo/vector-icons` arrastra `expo-font` → `expo-asset`
   y la suite no arranca. */
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

jest.mock('../../src/logic/ScannerLogic', () => ({
  useScannerLogic: () => ({ permission: null }),
}));

describe('ScannerScreen', () => {

  test('exporta un componente React válido (evita módulo vacío)', () => {
    expect(ScannerScreen).toBeDefined();
    expect(typeof ScannerScreen).toBe('function');
  });

  test('renderiza sin lanzar errores', () => {
    let renderer;

    act(() => {
      renderer = create(
        <ScannerScreen navigation={{}} route={{}} />
      );
    });

    expect(renderer.root).toBeTruthy();

    act(() => {
      renderer.unmount();
    });
  });

});
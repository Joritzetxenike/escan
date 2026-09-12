import React from 'react';
import { create, act } from 'react-test-renderer';

import ScannerScreen from '../../src/screens/ScannerScreen';

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: jest.fn(() => [null]),
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
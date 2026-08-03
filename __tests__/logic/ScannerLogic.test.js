import React from 'react';
import { create, act } from 'react-test-renderer';

import { useScannerLogic } from '../../src/logic/ScannerLogic';
import ScannerService from '../../src/services/ScannerService';

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(() => [null, jest.fn()]),
}));

jest.mock('../../src/services/ScannerService', () => ({
  esCodigoValido: jest.fn(),
  actualizarBuffer: jest.fn(),
  resetBufferIfStale: jest.fn(),
}));

// Harness: ejecuta el hook y expone su resultado en `current`.
let current = null;

function Harness({ navigation, route }) {
  current = useScannerLogic(navigation, route);
  return null;
}

describe('useScannerLogic', () => {

  const navigation = {
    goBack: jest.fn(),
  };

  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer.unmount();
      });
      renderer = null;
    }
    current = null;
  });

  const montar = (routeParams) => {
    const route = { params: routeParams };
    act(() => {
      renderer = create(
        <Harness navigation={navigation} route={route} />
      );
    });
  };

  // =====================================================
  // hintText
  // =====================================================

  describe('hintText', () => {

    test('indica escanear una ubicación', () => {
      montar({ tipo: 'ubicacion', onScan: jest.fn() });
      expect(current.hintText).toBe('Escanea una ubicación');
    });

    test('indica escanear un artículo', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });
      expect(current.hintText).toBe('Escanea un artículo');
    });

  });

  // =====================================================
  // volver
  // =====================================================

  describe('volver', () => {

    test('vuelve a la pantalla anterior', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });

      act(() => {
        current.volver();
      });

      expect(navigation.goBack).toHaveBeenCalled();
    });

  });

  // =====================================================
  // handleBarcodeScanned
  // =====================================================

  describe('handleBarcodeScanned', () => {

    test('ignora un código inválido', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });

      ScannerService.esCodigoValido.mockReturnValue(false);

      act(() => {
        current.handleBarcodeScanned({ type: 'ean13', data: '123' });
      });

      expect(ScannerService.actualizarBuffer).not.toHaveBeenCalled();
      expect(onScan).not.toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    test('no valida el código hasta acumular lecturas', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });

      ScannerService.esCodigoValido.mockReturnValue(true);
      ScannerService.actualizarBuffer.mockReturnValue({
        validado: false,
        buffer: { value: '123456', count: 1, lastTime: 0 },
      });

      act(() => {
        current.handleBarcodeScanned({ type: 'ean13', data: '123456' });
      });

      expect(onScan).not.toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    test('devuelve el código validado y vuelve atrás', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });

      ScannerService.esCodigoValido.mockReturnValue(true);
      ScannerService.actualizarBuffer.mockReturnValue({
        validado: true,
        buffer: { value: '', count: 0, lastTime: 0 },
      });

      act(() => {
        current.handleBarcodeScanned({ type: 'ean13', data: '123456' });
      });

      expect(onScan).toHaveBeenCalledWith({
        codigo: '123456',
        tipo: 'articulo',
      });

      expect(navigation.goBack).toHaveBeenCalled();
    });

  });

});

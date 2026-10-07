import React from 'react';
import { create, act } from 'react-test-renderer';

import { useScannerLogic } from '../../src/logic/ScannerLogic';
import ScannerService from '../../src/services/ScannerService';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  /* Se muta en el test de web para comprobar que el
     botón de flash no se ofrece allí. */
  Platform: {
    OS: 'android',
  },
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(() => [null, jest.fn()]),
}));

jest.mock('../../src/services/ScannerService', () => ({
  esCodigoValido: jest.fn(),
  actualizarBuffer: jest.fn(),
  resetBufferIfStale: jest.fn(),
}));

jest.mock('../../src/validators/UbicacionValidator', () => ({
  __esModule: true,
  default: {
    validarFormato: jest.fn(),
  },
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

    /* Desmonta lo anterior antes de volver a montar: el
       hook abre un `setInterval` que solo se limpia al
       desmontar, así que si no, un test que monte dos
       veces deja un intervalo vivo y jest no termina de
       salir. */
    if (renderer) {
      act(() => {
        renderer.unmount();
      });
    }

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

    test('avisa si una ubicación no sigue el formato, incluso si el código es corto', () => {
      const onScan = jest.fn();
      montar({ tipo: 'ubicacion', onScan });

      const UbicacionValidator =
        jest.requireMock('../../src/validators/UbicacionValidator').default;
      UbicacionValidator.validarFormato.mockReturnValue(false);

      act(() => {
        current.handleBarcodeScanned({ type: 'qr', data: '50100' });
      });

      const { Alert } = jest.requireMock('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación inválida',
        'El código 50100 no sigue el formato seccion-area-subzona (ej. LIN2-A01-Z01)'
      );

      expect(ScannerService.esCodigoValido).not.toHaveBeenCalled();
      expect(ScannerService.actualizarBuffer).not.toHaveBeenCalled();
      expect(onScan).not.toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    test('no repite el aviso con lecturas seguidas del mismo código inválido', () => {
      const onScan = jest.fn();
      montar({ tipo: 'ubicacion', onScan });

      const UbicacionValidator =
        jest.requireMock('../../src/validators/UbicacionValidator').default;
      UbicacionValidator.validarFormato.mockReturnValue(false);

      const { Alert } = jest.requireMock('react-native');

      act(() => {
        current.handleBarcodeScanned({ type: 'qr', data: '50100' });
      });

      act(() => {
        current.handleBarcodeScanned({ type: 'qr', data: '50100' });
      });

      expect(Alert.alert).toHaveBeenCalledTimes(1);
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


  // =====================================================
  // filtro del marco
  // =====================================================
  //
  // El recuadro de la cámara es decorativo: para que lo que
  // se ve dentro sea lo único que se escanea hay que medirlo
  // (`onLayout`) y descartar los `bounds` cuyo centro caiga
  // fuera. Coordenadas del marco de prueba: x 45, y 300,
  // 300x180 (centro 195,390; con tolerancia 32 → x 13..377,
  // y 268..502).

  describe('filtro del marco', () => {

    const medirMarco = (
      layout = { x: 45, y: 300, width: 300, height: 180 }
    ) => {
      act(() => {
        current.onFrameLayout({
          nativeEvent: { layout },
        });
      });
    };

    /* `bounds` con el centro en (cx, cy). */
    const boundsEn = (cx, cy) => ({
      origin: { x: cx - 25, y: cy - 10 },
      size: { width: 50, height: 20 },
    });

    test('descarta en silencio un código fuera del marco', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });
      medirMarco();

      ScannerService.esCodigoValido.mockReturnValue(true);

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
          bounds: boundsEn(10, 10),
        });
      });

      expect(ScannerService.esCodigoValido)
        .not.toHaveBeenCalled();
      expect(ScannerService.actualizarBuffer)
        .not.toHaveBeenCalled();
      expect(onScan).not.toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    test('el filtro se aplica antes de validar el formato: sin aviso si está fuera', () => {
      const onScan = jest.fn();
      montar({ tipo: 'ubicacion', onScan });
      medirMarco();

      const UbicacionValidator =
        jest.requireMock('../../src/validators/UbicacionValidator').default;
      UbicacionValidator.validarFormato.mockReturnValue(false);

      act(() => {
        current.handleBarcodeScanned({
          type: 'qr',
          data: '50100',
          bounds: boundsEn(10, 10),
        });
      });

      const { Alert } = jest.requireMock('react-native');
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(UbicacionValidator.validarFormato)
        .not.toHaveBeenCalled();
      expect(onScan).not.toHaveBeenCalled();
    });

    test('procesa un código dentro del marco', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });
      medirMarco();

      ScannerService.esCodigoValido.mockReturnValue(true);
      ScannerService.actualizarBuffer.mockReturnValue({
        validado: true,
        buffer: { value: '', count: 0, lastTime: 0 },
      });

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
          bounds: boundsEn(195, 390),
        });
      });

      expect(onScan).toHaveBeenCalledWith({
        codigo: '123456',
        tipo: 'articulo',
      });
      expect(navigation.goBack).toHaveBeenCalled();
    });

    test('acepta lo que quede dentro del margen de tolerancia (32 px)', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });
      medirMarco();

      ScannerService.esCodigoValido.mockReturnValue(true);

      /* Centro a 25 px del borde izquierdo dibujado (x=45):
         fuera del recuadro, dentro del margen. */
      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
          bounds: boundsEn(20, 390),
        });
      });

      expect(ScannerService.esCodigoValido)
        .toHaveBeenCalledWith('123456');
    });

    test('acepta si el marco aún no se ha medido', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });

      ScannerService.esCodigoValido.mockReturnValue(true);

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
          bounds: boundsEn(10, 10),
        });
      });

      expect(ScannerService.esCodigoValido)
        .toHaveBeenCalledWith('123456');
    });

    test('acepta si expo-camera no da bounds', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });
      medirMarco();

      ScannerService.esCodigoValido.mockReturnValue(true);

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
        });
      });

      expect(ScannerService.esCodigoValido)
        .toHaveBeenCalledWith('123456');
    });

    test('acepta si el rect de bounds está vacío', () => {
      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });
      medirMarco();

      ScannerService.esCodigoValido.mockReturnValue(true);

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
          bounds: {
            origin: { x: 0, y: 0 },
            size: { width: 0, height: 0 },
          },
        });
      });

      expect(ScannerService.esCodigoValido)
        .toHaveBeenCalledWith('123456');
    });

    test('volver a medir el marco no cambia nada si las medidas son las mismas', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });

      medirMarco();
      const rect = current.frameRect;

      medirMarco();

      expect(current.frameRect).toBe(rect);
    });

  });


  // =====================================================
  // flash
  // =====================================================

  describe('flash', () => {

    afterEach(() => {
      const { Platform } =
        jest.requireMock('react-native');
      Platform.OS = 'android';
    });

    test('empieza apagado', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });

      expect(current.flashActivo).toBe(false);
    });

    test('toggleFlash lo enciende y lo apaga', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });

      act(() => {
        current.toggleFlash();
      });

      expect(current.flashActivo).toBe(true);

      act(() => {
        current.toggleFlash();
      });

      expect(current.flashActivo).toBe(false);
    });

    test('dos pulsaciones seguidas se anulan entre sí', () => {

      /* Este es el test que distingue las dos formas de
         invertir el estado. Con `setFlashActivo(!flashActivo)`
         —que lee el valor capturado en ese render— las dos
         pulsaciones calcularían `!false` y dejarían el flash
         encendido. Con el actualizador funcional cada una
         parte del resultado anterior y el par se anula. */

      montar({ tipo: 'articulo', onScan: jest.fn() });

      act(() => {
        current.toggleFlash();
        current.toggleFlash();
      });

      expect(current.flashActivo).toBe(false);
    });

    test('encenderlo no interfiere con el escaneo', () => {

      const onScan = jest.fn();
      montar({ tipo: 'articulo', onScan });

      act(() => {
        current.toggleFlash();
      });

      ScannerService.esCodigoValido.mockReturnValue(true);
      ScannerService.actualizarBuffer.mockReturnValue({
        validado: true,
        buffer: { value: '', count: 0, lastTime: 0 },
      });

      act(() => {
        current.handleBarcodeScanned({
          type: 'ean13',
          data: '123456',
        });
      });

      expect(onScan).toHaveBeenCalledWith({
        codigo: '123456',
        tipo: 'articulo',
      });
      expect(navigation.goBack).toHaveBeenCalled();
    });

    test('se ofrece en nativo y no en web', () => {
      montar({ tipo: 'articulo', onScan: jest.fn() });

      expect(current.soportaFlash).toBe(true);

      const { Platform } =
        jest.requireMock('react-native');

      Platform.OS = 'web';

      montar({ tipo: 'articulo', onScan: jest.fn() });

      expect(current.soportaFlash).toBe(false);
    });

  });

});

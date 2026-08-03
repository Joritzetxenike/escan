import React from 'react';
import { create, act } from 'react-test-renderer';
import { Alert } from 'react-native';

import { useHomeLogic } from '../../src/logic/HomeLogic';
import InventoryService from '../../src/services/InventoryService';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../src/services/InventoryService', () => ({
  cargarUbicacion: jest.fn(),
  validarArticulo: jest.fn(),
  crearMovimiento: jest.fn(),
  guardarMovimiento: jest.fn(),
}));

// Harness: ejecuta el hook y expone su resultado en `current`.
let current = null;

function Harness({ navigation }) {
  current = useHomeLogic(navigation);
  return null;
}

describe('useHomeLogic', () => {

  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      renderer = create(<Harness navigation={navigation} />);
    });
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
    current = null;
  });

  // =====================================================
  // abrirScannerUbicacion / abrirScannerArticulo
  // =====================================================

  describe('abrirScannerUbicacion', () => {

    test('navega al scanner de tipo ubicacion', () => {
      act(() => {
        current.abrirScannerUbicacion();
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'Scanner',
        expect.objectContaining({
          tipo: 'ubicacion',
          onScan: expect.any(Function),
        })
      );
    });

  });

  describe('abrirScannerArticulo', () => {

    test('navega al scanner de tipo articulo', () => {
      act(() => {
        current.abrirScannerArticulo();
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'Scanner',
        expect.objectContaining({
          tipo: 'articulo',
          onScan: expect.any(Function),
        })
      );
    });

  });

  // =====================================================
  // cargarUbicacion
  // =====================================================

  describe('cargarUbicacion', () => {

    test('guarda la ubicación y devuelve sus artículos', async () => {
      const articulos = [
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
      ];

      InventoryService.cargarUbicacion.mockResolvedValue(articulos);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacion).toBe('A1');
      expect(InventoryService.cargarUbicacion)
        .toHaveBeenCalledWith('A1');
    });

  });

  // =====================================================
  // procesarArticulo (via procesarEscaneo / onManualCode)
  // =====================================================

  describe('procesarArticulo', () => {

    test('muestra alerta si el artículo no es válido', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: false,
        titulo: 'Artículo no encontrado',
        mensaje: 'El código 999999 no existe en el maestro',
      });

      await act(async () => {
        await current.onManualCode('999999');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Artículo no encontrado',
        'El código 999999 no existe en el maestro'
      );

      expect(current.articuloTemp).toBeNull();
    });

    test('avisa cuando el artículo es SIC', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: true,
        articulo: { item: '123456', tipo: 'SIC' },
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Artículo SIC',
        expect.stringContaining('123456')
      );

      expect(current.articuloTemp).toBe('123456');
    });

    test('acepta un artículo válido y pide la cantidad', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(current.articuloTemp).toBe('123456');
      expect(current.mostrarCantidad).toBe(true);
    });

  });

  // =====================================================
  // confirmarCantidad
  // =====================================================

  describe('confirmarCantidad', () => {

    test('guarda el movimiento, actualiza últimos y limpia', async () => {
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });
      InventoryService.crearMovimiento.mockImplementation(
        (ubicacion, articulo, cantidad) => ({
          ubicacion,
          articulo,
          cantidad,
        })
      );
      InventoryService.guardarMovimiento.mockResolvedValue({});

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.procesarEscaneo('articulo', '123456');
      });

      await act(async () => {
        await current.confirmarCantidad(5);
      });

      expect(InventoryService.guardarMovimiento)
        .toHaveBeenCalledWith({
          ubicacion: 'A1',
          articulo: '123456',
          cantidad: 5,
        });

      expect(current.ultimosArticulos).toEqual([
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
      ]);

      expect(current.articuloTemp).toBeNull();
      expect(current.mostrarCantidad).toBe(false);
    });

  });

});

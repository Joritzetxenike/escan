import React from 'react';
import { create, act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useHomeLogic } from '../../src/logic/HomeLogic';
import InventoryService from '../../src/services/InventoryService';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../src/services/InventoryService', () => ({
  cargarUbicacion: jest.fn(),
  validarArticulo: jest.fn(),
  validarUbicacion: jest.fn(),
  crearMovimiento: jest.fn(),
  guardarMovimiento: jest.fn(),
  estaUbicacionFinalizada: jest.fn(),
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

    test('avisa si aún no hay ubicación y no navega', () => {
      act(() => {
        current.abrirScannerArticulo();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Primero escanea una ubicación'
      );

      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    test('navega al scanner de tipo articulo si hay ubicación', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

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
  // abrirModalManual
  // =====================================================

  describe('abrirModalManual', () => {

    test('avisa si aún no hay ubicación y no abre el modal', () => {
      act(() => {
        current.abrirModalManual();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Primero escanea una ubicación'
      );

      expect(current.mostrarManual).toBe(false);
    });

    test('abre el modal de código manual si hay ubicación', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      act(() => {
        current.abrirModalManual();
      });

      expect(current.mostrarManual).toBe(true);
    });

  });

  // =====================================================
  // cargarUbicacion
  // =====================================================

  describe('cargarUbicacion', () => {

    test('guarda la ubicación y devuelve sus artículos si es válida', async () => {
      const articulos = [
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
      ];

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue(articulos);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacion).toBe('A1');
      expect(InventoryService.validarUbicacion)
        .toHaveBeenCalledWith('A1');
      expect(InventoryService.cargarUbicacion)
        .toHaveBeenCalledWith('A1');
    });

    test('no carga la ubicación y avisa si no existe en el maestro', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: false,
        titulo: 'Ubicación no encontrada',
        mensaje: 'El código 99999-999-Z999 no existe en el maestro',
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', '99999-999-Z999');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación no encontrada',
        'El código 99999-999-Z999 no existe en el maestro'
      );

      expect(current.ubicacion).toBeNull();
      expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();
    });

  });

  // =====================================================
  // ubicacionFinalizada
  // =====================================================

  describe('ubicacionFinalizada', () => {

    test('marca la ubicación como no finalizada si está en Inicio', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Inicio' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacionFinalizada).toBe(false);
    });

    test('marca la ubicación como finalizada si escanea una en estado Fin', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Fin' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacionFinalizada).toBe(true);
    });

    test('bloquea artículos si la ubicación escaneada ya está terminada', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Fin' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación terminada',
        expect.stringContaining('A1')
      );

      expect(InventoryService.validarArticulo).not.toHaveBeenCalled();
      expect(current.articuloTemp).toBeNull();
    });

    test('revalida al volver a Home y bloquea si la ubicación pasó a Fin', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Inicio' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });
      InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });
      expect(current.ubicacionFinalizada).toBe(false);

      const alEnfocar = useFocusEffect.mock.calls.at(-1)[0];
      await act(async () => {
        await alEnfocar();
      });

      expect(InventoryService.estaUbicacionFinalizada)
        .toHaveBeenCalledWith('A1');
      expect(current.ubicacionFinalizada).toBe(true);

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación terminada',
        expect.stringContaining('A1')
      );

      expect(InventoryService.validarArticulo).not.toHaveBeenCalled();
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
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });
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

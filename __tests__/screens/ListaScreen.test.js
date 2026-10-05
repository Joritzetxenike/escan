import React from 'react';
import { create, act } from 'react-test-renderer';
import { TouchableOpacity, Alert } from 'react-native';

import ListaScreen from '../../src/screens/ListaScreen';
import InventoryService from '../../src/services/InventoryService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';


// =====================================================
// MOCKS
// =====================================================

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  readDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('../../src/components/EstadoBanner', () => () => null);

jest.mock('../../src/components/ArticulosModal', () => () => null);

jest.mock('../../src/services/InventoryService', () => ({
  estaUbicacionFinalizada: jest.fn(),
  finalizarUbicacion: jest.fn(),
  eliminarMovimiento: jest.fn(),
}));


// =====================================================
// TEST
// =====================================================

describe('ListaScreen', () => {

  const CSV = '50100-111-Z101.csv';
  const UBICACION = '50100-111-Z101';

  let renderer;

  beforeEach(() => {

    jest.clearAllMocks();

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    jest.spyOn(console, 'error').mockImplementation(() => {});

    FileSystem.readDirectoryAsync.mockResolvedValue([CSV]);

    Sharing.shareAsync.mockResolvedValue(undefined);

    InventoryService.finalizarUbicacion.mockResolvedValue({
      pendiente: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const montar = async () => {

    await act(async () => {
      renderer = create(<ListaScreen />);
    });

    /* Los CSV se cargan al enfocar la pantalla */

    const alEnfocar = useFocusEffect.mock.calls.at(-1)[0];

    await act(async () => {
      await alEnfocar();
    });
  };

  /* Con un solo CSV la fila tiene tres botones:
     nombre, compartir y borrar. El segundo es el de compartir. */

  const compartir = async () => {
    await act(async () => {
      renderer.root.findAllByType(TouchableOpacity)[1].props.onPress();
    });
  };


  // =====================================================
  // COMPARTIR CUANDO YA ESTÁ CERRADA
  // =====================================================

  it('comparte sin volver a cerrar si la ubicación ya está cerrada', async () => {

    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    await montar();
    await compartir();

    expect(InventoryService.estaUbicacionFinalizada)
      .toHaveBeenCalledWith(UBICACION);

    expect(InventoryService.finalizarUbicacion)
      .not.toHaveBeenCalled();

    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Ubicación terminada',
      expect.any(String)
    );

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      `file:///test/${CSV}`,
      expect.objectContaining({ mimeType: 'text/csv' })
    );
  });


  // =====================================================
  // COMPARTIR CUANDO SIGUE ABIERTA
  // =====================================================

  it('cierra la ubicación y luego comparte si sigue abierta', async () => {

    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();
    await compartir();

    expect(InventoryService.finalizarUbicacion)
      .toHaveBeenCalledTimes(1);

    expect(InventoryService.finalizarUbicacion)
      .toHaveBeenCalledWith(UBICACION);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Ubicación terminada',
      expect.stringContaining(UBICACION)
    );

    expect(Sharing.shareAsync).toHaveBeenCalled();
  });


  // =====================================================
  // COMPARTIR CUANDO NO SE PUEDE COMPROBAR
  // =====================================================

  it('comparte sin cerrar cuando no se puede comprobar el estado', async () => {

    InventoryService.estaUbicacionFinalizada
      .mockRejectedValue(new Error('sin red'));

    await montar();
    await compartir();

    /* Cerrar a ciegas es lo que duplica la cola */

    expect(InventoryService.finalizarUbicacion)
      .not.toHaveBeenCalled();

    expect(Sharing.shareAsync).toHaveBeenCalled();
  });


  // =====================================================
  // COMPARTIR AUNQUE EL CIERRE FALLE
  // =====================================================

  it('comparte aunque no se pueda marcar la ubicación como terminada', async () => {

    InventoryService.estaUbicacionFinalizada
      .mockResolvedValue(false);

    InventoryService.finalizarUbicacion
      .mockRejectedValue(new Error('fallo'));

    await montar();
    await compartir();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Aviso',
      expect.any(String)
    );

    expect(Sharing.shareAsync).toHaveBeenCalled();
  });

});
import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import ListaScreen from '../../src/screens/ListaScreen';
import InventoryService from '../../src/services/InventoryService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useNavigation } from '@react-navigation/native';


// =====================================================
// MOCKS
// =====================================================

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('../../src/components/EstadoBanner', () => () => null);

/* La pantalla real abre el CSV desde el modal: aquí el modal
   solo expone botones que llaman a los handlers con su
   `titulo` (el nombre del CSV), que es lo que se prueba. */

jest.mock('../../src/components/ArticulosModal', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');

  return ({ onExportar, onBorrar, titulo }) => (
    <>
      {onExportar && (
        <TouchableOpacity
          testID="exportar-csv"
          onPress={() => onExportar(titulo)}
        />
      )}
      {onBorrar && (
        <TouchableOpacity
          testID="borrar-csv"
          onPress={() => onBorrar(titulo)}
        />
      )}
    </>
  );
});

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

  const navegar = jest.fn();

  let renderer;

  beforeEach(() => {

    jest.clearAllMocks();

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    jest.spyOn(console, 'error').mockImplementation(() => {});

    useNavigation.mockReturnValue({ navigate: navegar });

    FileSystem.readDirectoryAsync.mockResolvedValue([CSV]);

    FileSystem.getInfoAsync.mockResolvedValue({ exists: true });

    FileSystem.readAsStringAsync.mockResolvedValue(`${UBICACION},123456,5`);

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

  /* Abre el CSV tocando su nombre en la lista. */

  const abrirPorNombre = async () => {
    await act(async () => {
      const textos = renderer.root.findAllByType(Text);
      const match = textos.find((t) => t.props.children === CSV);

      let nodo = match.parent;
      while (nodo && typeof nodo.props?.onPress !== 'function') {
        nodo = nodo.parent;
      }

      await nodo.props.onPress();
    });
  };

  const presionar = async (testID) => {
    await act(async () => {
      await renderer.root.findByProps({ testID }).props.onPress();
    });
  };

  const onScan = () => {
    const llamada = navegar.mock.calls.find((c) => c[0] === 'Scanner');
    return llamada[1].onScan;
  };


  // =====================================================
  // COMPARTIR CUANDO YA ESTÁ CERRADA
  // =====================================================

  it('comparte sin volver a cerrar si la ubicación ya está cerrada', async () => {

    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    await montar();
    await abrirPorNombre();
    await presionar('exportar-csv');

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
    await abrirPorNombre();
    await presionar('exportar-csv');

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
    await abrirPorNombre();
    await presionar('exportar-csv');

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
    await abrirPorNombre();
    await presionar('exportar-csv');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Aviso',
      expect.any(String)
    );

    expect(Sharing.shareAsync).toHaveBeenCalled();
  });


  // =====================================================
  // ESCANEAR UBICACIÓN
  // =====================================================

  it('navega al escáner de ubicación y abre el CSV escaneado', async () => {

    await montar();

    await presionar('btn-escanear-ubicacion-lista');

    expect(navegar).toHaveBeenCalledWith(
      'Scanner',
      expect.objectContaining({ tipo: 'ubicacion' })
    );

    await act(async () => {
      await onScan()({ codigo: UBICACION });
    });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      `file:///test/${CSV}`
    );

    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Sin registros',
      expect.any(String)
    );
  });


  // =====================================================
  // UBICACIÓN SIN CSV
  // =====================================================

  it('avisa si la ubicación escaneada no tiene CSV', async () => {

    FileSystem.getInfoAsync.mockResolvedValue({ exists: false });

    await montar();

    await presionar('btn-escanear-ubicacion-lista');

    await act(async () => {
      await onScan()({ codigo: UBICACION });
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sin registros',
      expect.stringContaining(UBICACION)
    );

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

});

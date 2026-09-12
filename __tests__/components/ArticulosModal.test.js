import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import ArticulosModal from '../../src/components/ArticulosModal';
import InventoryService from '../../src/services/InventoryService';

jest.mock('../../src/services/InventoryService', () => ({
  estaUbicacionFinalizada: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

describe('ArticulosModal', () => {

  let renderer;

  const articulos = [
    { articulo: '123456', cantidad: 3 },
    { articulo: '654321', cantidad: 1 },
  ];

  const dataProps = {
    visible: true,
    titulo: '50100-111-Z101',
    articulos,
    onCerrar: jest.fn(),
    onIniciarEdicion: jest.fn(),
    onGuardarEdicion: jest.fn(),
    onChangeValor: jest.fn(),
    onEliminar: jest.fn(),
  };

  const textoDe = (nodo) => {
    const children = nodo.props.children;
    return Array.isArray(children) ? children.join('') : children;
  };

  const presionarPorTexto = (texto) => {
    const textos = renderer.root.findAllByType(Text);
    const match = textos.find((t) => String(textoDe(t)) === texto);
    expect(match).toBeTruthy();

    let nodo = match.parent;
    while (nodo && typeof nodo.props?.onPress !== 'function') {
      nodo = nodo.parent;
    }

    expect(nodo).toBeTruthy();
    nodo.props.onPress();
  };

  const montar = async (sobres = {}) => {
    await act(async () => {
      renderer = create(<ArticulosModal {...dataProps} {...sobres} />);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
    act(() => {
      renderer.unmount();
    });
  });

  test('bloquea editar la cantidad si el servicio dice que está terminada', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    await montar();

    presionarPorTexto('3');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Ubicación terminada',
      expect.stringContaining('50100-111-Z101')
    );

    expect(dataProps.onIniciarEdicion).not.toHaveBeenCalled();
  });

  test('bloquea eliminar si el servicio dice que está terminada', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    await montar();

    presionarPorTexto('delete-outline');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Ubicación terminada',
      expect.stringContaining('50100-111-Z101')
    );

    expect(dataProps.onEliminar).not.toHaveBeenCalled();
  });

  test('permite editar y eliminar si el servicio dice que no está terminada', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    presionarPorTexto('3');
    presionarPorTexto('delete-outline');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(dataProps.onIniciarEdicion).toHaveBeenCalledWith(0);
    expect(dataProps.onEliminar).toHaveBeenCalledWith(0);
  });

  test('consulta el estado con codigoUbicacion si se pasa (aunque titulo lleve .csv)', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      titulo: '50100-111-Z101.csv',
      codigoUbicacion: '50100-111-Z101',
    });

    expect(InventoryService.estaUbicacionFinalizada)
      .toHaveBeenCalledWith('50100-111-Z101');
  });

});
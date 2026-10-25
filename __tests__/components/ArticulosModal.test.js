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

  const escribirBusqueda = (texto) => {
    const input = renderer.root.findByProps({ testID: 'input-buscar-articulo' });
    act(() => {
      input.props.onChangeText(texto);
    });
  };

  const existeTexto = (texto) =>
    renderer.root
      .findAllByType(Text)
      .some((t) => String(textoDe(t)) === texto);

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

  test('muestra y dispara exportar y borrar CSV con el titulo', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    const onExportar = jest.fn();
    const onBorrar = jest.fn();

    await montar({
      titulo: '50100-111-Z101.csv',
      codigoUbicacion: '50100-111-Z101',
      onExportar,
      onBorrar,
    });

    /* Se permiten aunque la ubicación esté terminada: el CSV
       completo sí se puede exportar y borrar. */

    presionarPorTexto('Exportar');
    presionarPorTexto('Borrar CSV');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onExportar).toHaveBeenCalledWith('50100-111-Z101.csv');
    expect(onBorrar).toHaveBeenCalledWith('50100-111-Z101.csv');
  });

  test('filtra los artículos por código ignorando mayúsculas', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      articulos: [
        { articulo: 'ABC123', cantidad: 1 },
        { articulo: 'xyz789', cantidad: 2 },
      ],
    });

    escribirBusqueda('123');
    expect(existeTexto('ABC123')).toBe(true);
    expect(existeTexto('xyz789')).toBe(false);

    escribirBusqueda('abc');
    expect(existeTexto('ABC123')).toBe(true);
    expect(existeTexto('xyz789')).toBe(false);

    escribirBusqueda('YZ');
    expect(existeTexto('ABC123')).toBe(false);
    expect(existeTexto('xyz789')).toBe(true);
  });

  test('muestra descripción y unidad de cada artículo', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      articulos: [
        {
          articulo: 'ABC123',
          cantidad: 1,
          dsca: 'Tornillo hexagonal',
          unidad: 'UD',
        },
        {
          articulo: 'XYZ789',
          cantidad: 2,
          dsca: '',
          unidad: '',
        },
      ],
    });

    expect(existeTexto('Descripción')).toBe(true);
    expect(existeTexto('Unidad')).toBe(true);
    expect(existeTexto('Tornillo hexagonal')).toBe(true);
    expect(existeTexto('UD')).toBe(true);
    expect(
      renderer.root
        .findAllByType(Text)
        .filter((t) => textoDe(t) === '—')
    ).toHaveLength(2);
  });

  test('avisa cuando el filtro no encuentra ningún código', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    escribirBusqueda('nada-coincide');

    expect(existeTexto('Sin resultados para «nada-coincide»')).toBe(true);
    expect(existeTexto('123456')).toBe(false);
  });

  test('al filtrar, editar y eliminar usan el índice original', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      articulos: [
        { articulo: 'AA111', cantidad: 11 },
        { articulo: 'BB222', cantidad: 22 },
        { articulo: 'CC333', cantidad: 33 },
      ],
    });

    escribirBusqueda('CC');

    expect(existeTexto('AA111')).toBe(false);
    expect(existeTexto('CC333')).toBe(true);

    presionarPorTexto('33');
    presionarPorTexto('delete-outline');

    expect(dataProps.onIniciarEdicion).toHaveBeenCalledWith(2);
    expect(dataProps.onEliminar).toHaveBeenCalledWith(2);
  });

  test('limpia el filtro al cerrar y volver a abrir', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    escribirBusqueda('654');
    expect(existeTexto('123456')).toBe(false);

    await act(async () => {
      renderer.update(<ArticulosModal {...dataProps} visible={false} />);
      await Promise.resolve();
    });

    await act(async () => {
      renderer.update(<ArticulosModal {...dataProps} visible />);
      await Promise.resolve();
    });

    expect(existeTexto('123456')).toBe(true);
  });

  test('no muestra acciones CSV si no se pasan los handlers', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    const textos = renderer.root
      .findAllByType(Text)
      .map((t) => textoDe(t));

    expect(textos).not.toContain('Exportar');
    expect(textos).not.toContain('Borrar CSV');
  });

});
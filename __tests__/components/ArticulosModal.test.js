import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import ArticulosModal from '../../src/components/ArticulosModal';
import InventoryService from '../../src/services/InventoryService';

jest.mock('../../src/services/InventoryService', () => ({
  estaUbicacionFinalizada: jest.fn(),
}));

jest.mock('../../src/components/PlanosModal', () => (props) => {
  const React = require('react');
  const { View } = require('react-native');
  return React.createElement(View, { testID: 'planos-modal', ...props });
});

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

  const pulsar = (testID) => {
    const nodo = renderer.root.findByProps({ testID });
    act(() => {
      nodo.props.onPress();
    });
  };

  const existeTestID = (testID) =>
    renderer.root.findAllByProps({ testID }).length > 0;

  // ---------- Lista ----------

  test('la lista enseña solo el código completo y la cantidad', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      articulos: [
        { articulo: '-BXC05.4010 -SUB', cantidad: 7, dsca: 'SUB-C.KIT ESTANT', unidad: 'U' },
      ],
    });

    expect(existeTexto('-BXC05.4010 -SUB')).toBe(true);
    expect(existeTexto('7')).toBe(true);

    /* Descripción y unidad solo en el detalle */
    expect(existeTexto('SUB-C.KIT ESTANT')).toBe(false);
    expect(existeTexto('Descripción')).toBe(false);

    /* El código no se recorta */
    const codigo = renderer.root
      .findAllByType(Text)
      .find((t) => textoDe(t) === '-BXC05.4010 -SUB');
    expect(codigo.props.numberOfLines).toBeUndefined();
  });

  test('tocar una fila abre su detalle', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    pulsar('fila-articulo-1');

    expect(dataProps.onIniciarEdicion).toHaveBeenCalledWith(1);
  });

  // ---------- Detalle ----------

  const conDetalle = {
    articulos: [
      { articulo: 'ABC123', cantidad: 3, dsca: 'Tornillo hexagonal', unidad: 'UD' },
      { articulo: 'XYZ789', cantidad: 2, dsca: '', unidad: '' },
    ],
    editandoIndex: 0,
    editandoValor: '3',
  };

  test('el detalle muestra artículo, descripción, unidad y cantidad editable', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar(conDetalle);

    expect(existeTestID('detalle-articulo')).toBe(true);
    expect(existeTexto('Tornillo hexagonal')).toBe(true);
    expect(existeTexto('UD')).toBe(true);

    const input = renderer.root.findByProps({ testID: 'input-cantidad-detalle' });
    expect(input.props.value).toBe('3');

    act(() => {
      input.props.onChangeText('9');
    });
    expect(dataProps.onChangeValor).toHaveBeenCalledWith('9');
  });

  test('sin descripción ni unidad muestra —', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({ ...conDetalle, editandoIndex: 1, editandoValor: '2' });

    expect(
      renderer.root.findAllByType(Text).filter((t) => textoDe(t) === '—')
    ).toHaveLength(2);
  });

  test('Guardar, Eliminar y Cancelar llaman a la pantalla con el índice real', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    const onCancelarEdicion = jest.fn();

    await montar({ ...conDetalle, onCancelarEdicion });

    pulsar('btn-guardar-detalle');
    pulsar('btn-eliminar-detalle');
    pulsar('btn-cerrar-detalle');

    expect(dataProps.onGuardarEdicion).toHaveBeenCalledWith(0);
    expect(dataProps.onEliminar).toHaveBeenCalledWith(0);
    expect(onCancelarEdicion).toHaveBeenCalled();
  });

  test('sin onEliminar (pestaña Estado) no hay botón de eliminar', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({ ...conDetalle, onEliminar: undefined });

    expect(existeTestID('btn-guardar-detalle')).toBe(true);
    expect(existeTestID('btn-eliminar-detalle')).toBe(false);
  });

  test('ubicación terminada: el detalle es de solo lectura', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

    await montar(conDetalle);

    expect(existeTestID('detalle-articulo')).toBe(true);
    expect(existeTexto('Tornillo hexagonal')).toBe(true);

    expect(existeTestID('input-cantidad-detalle')).toBe(false);
    expect(existeTestID('btn-guardar-detalle')).toBe(false);
    expect(existeTestID('btn-eliminar-detalle')).toBe(false);
    expect(existeTestID('aviso-terminada')).toBe(true);
    expect(existeTexto('Cerrar')).toBe(true);
  });

  test('sin fila seleccionada no hay detalle', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    expect(existeTestID('detalle-articulo')).toBe(false);
  });

  // ---------- Planos ----------

  test('sin conPlanos no hay botón de planos', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    expect(existeTestID('btn-planos-csv')).toBe(false);
    expect(existeTestID('planos-modal')).toBe(false);
  });

  test('con conPlanos abre los planos de la sección y el área de la ubicación', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar({
      titulo: 'CARP-A01-Z05.csv',
      codigoUbicacion: 'CARP-A01-Z05',
      conPlanos: true,
    });

    const modal = () => renderer.root.findByProps({ testID: 'planos-modal' });

    expect(modal().props.seccion).toBe('CARP');
    expect(modal().props.area).toBe('A01');
    expect(modal().props.visible).toBe(false);

    pulsar('btn-planos-csv');
    expect(modal().props.visible).toBe(true);

    act(() => {
      modal().props.onCerrar();
    });
    expect(modal().props.visible).toBe(false);
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

  test('avisa cuando el filtro no encuentra ningún código', async () => {
    InventoryService.estaUbicacionFinalizada.mockResolvedValue(false);

    await montar();

    escribirBusqueda('nada-coincide');

    expect(existeTexto('Sin resultados para «nada-coincide»')).toBe(true);
    expect(existeTexto('123456')).toBe(false);
  });

  test('al filtrar, la fila abre el detalle con el índice original', async () => {
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

    pulsar('fila-articulo-2');

    expect(dataProps.onIniciarEdicion).toHaveBeenCalledWith(2);
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
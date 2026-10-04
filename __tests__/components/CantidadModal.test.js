import React from 'react';
import { create, act } from 'react-test-renderer';
import {
  Text,
  TextInput,
  Alert,
} from 'react-native';

import CantidadModal from '../../src/components/CantidadModal';

describe('CantidadModal', () => {

  let renderer;

  const dataProps = {
    visible: true,
    ubicacion: 'LIN2-A01-Z01',
    articulo: '123456',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
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

    act(() => {
      nodo.props.onPress();
    });
  };

  const escribirCantidad = (valor) => {
    act(() => {
      renderer.root
        .findByType(TextInput)
        .props.onChangeText(valor);
    });
  };

  const montar = (sobres = {}) => {
    act(() => {
      renderer = create(
        <CantidadModal {...dataProps} {...sobres} />
      );
    });

    return renderer;
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


  // =====================================================
  // CONTENIDO
  // =====================================================

  describe('contenido', () => {

    test('indica la ubicación y el artículo que se cuenta', () => {
      montar();

      /* `Ubicación: {ubicacion}` son dos hijos del mismo
         `Text`, así que hay que unirlo para comprobarlo. */

      const textos =
        renderer.root
          .findAllByType(Text)
          .map((t) => String(textoDe(t)));

      expect(textos)
        .toContain('Ubicación: LIN2-A01-Z01');
      expect(textos)
        .toContain('Artículo: 123456');
      expect(textos)
        .toContain('Introduce cantidad');
    });


    // ===================================================
    // VALIDACIÓN
    // ===================================================
    //
    // Este modal usaba `alert`, que en React Native no
    // existe: teclear una cantidad inválida reventaba la
    // app en vez de avisar.

    test('rechaza una cantidad no válida sin romper', () => {

      for (const valor of ['', '0', '-2', 'abc']) {

        montar();

        escribirCantidad(valor);
        presionarPorTexto('Confirmar');

        expect(dataProps.onConfirm)
          .not.toHaveBeenCalled();

        expect(Alert.alert).toHaveBeenCalled();

        act(() => {
          renderer.unmount();
        });
      }

    });

    test('confirma la cantidad como número', () => {
      montar();

      escribirCantidad('5');
      presionarPorTexto('Confirmar');

      expect(dataProps.onConfirm)
        .toHaveBeenCalledWith(5);

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('cancelar no confirma nada', () => {
      montar();

      escribirCantidad('5');
      presionarPorTexto('Cancelar');

      expect(dataProps.onCancel)
        .toHaveBeenCalledTimes(1);
      expect(dataProps.onConfirm)
        .not.toHaveBeenCalled();
    });

  });

});
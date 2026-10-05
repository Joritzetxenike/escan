import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

import ManualCodeModal from '../../src/components/ManualCodeModal';

describe('ManualCodeModal', () => {

  let renderer;

  const dataProps = {
    visible: true,
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

  const escribirCodigo = (valor) => {
    act(() => {
      renderer.root
        .findByType(TextInput)
        .props.onChangeText(valor);
    });
  };

  /* Igual que `presionarPorTexto`, pero esperando a que
     termine el `onConfirm`, que ahora es asíncrono. */

  const confirmarYEsperar = async () => {
    const textos = renderer.root.findAllByType(Text);
    const match = textos.find((t) => String(textoDe(t)) === 'Confirmar');

    let nodo = match.parent;
    while (nodo && typeof nodo.props?.onPress !== 'function') {
      nodo = nodo.parent;
    }

    await act(async () => {
      await nodo.props.onPress();
    });
  };

  const valorDelCampo = () =>
    renderer.root.findByType(TextInput).props.value;

  const montar = (sobres = {}) => {
    act(() => {
      renderer = create(
        <ManualCodeModal {...dataProps} {...sobres} />
      );
    });

    return renderer;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });


  // =====================================================
  // ARTÍCULO
  // =====================================================

  describe('código de artículo', () => {

    test('confirma el código tecleado', () => {
      montar();

      escribirCodigo('123456');
      presionarPorTexto('Confirmar');

      expect(dataProps.onConfirm)
        .toHaveBeenCalledWith('123456');
    });

    test('no confirma si el campo está vacío', () => {
      montar();

      /* Con el teclado todavía sin escribir nada no debe
         pasar un código vacío al validador. */

      for (const valor of ['', null, undefined]) {

        if (valor === null || valor === undefined) continue;

        escribirCodigo(valor);
        presionarPorTexto('Confirmar');
      }

      expect(dataProps.onConfirm)
        .not.toHaveBeenCalled();
    });

    test('respeta las mayúsculas del artículo', () => {

      montar();

      const input =
        renderer.root.findByType(TextInput);

      /* Los códigos de artículo distinguen mayúsculas de
         minúsculas: aquí no se fuerzan. */

      expect(input.props.autoCapitalize)
        .toBe('none');

    });

  });


  // =====================================================
  // UBICACIÓN
  // =====================================================

  describe('código de ubicación', () => {

    const propsUbicacion = {
      titulo: 'Introduce el código de ubicación',
      placeholder: 'LIN2-A01-Z01',
      autoCapitalize: 'characters',
      testID: 'input-ubicacion-manual',
    };

    test('muestra el título y el formato de ejemplo', () => {
      montar(propsUbicacion);

      const texto =
        JSON.stringify(renderer.toJSON());

      expect(texto)
        .toContain('Introduce el código de ubicación');
      expect(texto).toContain('LIN2-A01-Z01');
    });

    test('fuerza mayúsculas, como los códigos de ubicación', () => {

      montar(propsUbicacion);

      expect(
        renderer.root.findByType(TextInput).props
          .autoCapitalize
      ).toBe('characters');

    });

    test('expone el testID para las pruebas', () => {

      montar(propsUbicacion);

      expect(
        renderer.root.findByType(TextInput).props.testID
      ).toBe('input-ubicacion-manual');

    });

    test('confirma el código tecleado', () => {
      montar(propsUbicacion);

      escribirCodigo('LIN2-A01-Z01');
      presionarPorTexto('Confirmar');

      expect(dataProps.onConfirm)
        .toHaveBeenCalledWith('LIN2-A01-Z01');
    });

  });


  // =====================================================
  // CÓDIGO RECHAZADO
  // =====================================================

  describe('cuando el código no se acepta', () => {

    /* Es lo que pasa con un artículo tecleado a mano que no
       existe: el modal avisa y se queda abierto, así que el
       texto tiene que sobrevivir para poder corregirlo. */

    test('conserva el texto para que se pueda corregir', async () => {

      montar({
        onConfirm: jest.fn().mockResolvedValue(false),
      });

      escribirCodigo('999999');
      await confirmarYEsperar();

      expect(valorDelCampo()).toBe('999999');
    });

    test('vacía el texto cuando sí se acepta', async () => {

      montar({
        onConfirm: jest.fn().mockResolvedValue(true),
      });

      escribirCodigo('123456');
      await confirmarYEsperar();

      expect(valorDelCampo()).toBe('');
    });

  });


  // =====================================================
  // CICLO DE VIDA
  // =====================================================

  describe('al cerrar', () => {

    test('limpia el campo para la siguiente vez', () => {

      montar();

      escribirCodigo('123456');

      /* `Modal` no renderiza sus hijos cuando no es
         visible, así que hay que ocultarlo para disparar
         el borrado y volverlo a mostrar para mirar el
         campo ya limpio. */

      act(() => {
        renderer.update(
          <ManualCodeModal
            {...dataProps}
            visible={false}
          />
        );
      });

      act(() => {
        renderer.update(
          <ManualCodeModal {...dataProps} />
        );
      });

      expect(
        renderer.root.findByType(TextInput).props.value
      ).toBe('');
    });

  });

});
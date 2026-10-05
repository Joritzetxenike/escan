import React from 'react';
import { create, act } from 'react-test-renderer';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import ModalFormulario from '../../src/components/ModalFormulario';

import { colors } from '../../src/styles/styles';

describe('ModalFormulario', () => {

  let renderer;

  const dataProps = {
    visible: true,
    titulo: 'Introduce cantidad',
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
    nodo.props.onPress();
  };

  const botonPorTexto = (texto) => {
    const textos = renderer.root.findAllByType(Text);
    const match = textos.find((t) => String(textoDe(t)) === texto);

    let nodo = match.parent;
    while (nodo && nodo.type !== TouchableOpacity) {
      nodo = nodo.parent;
    }

    return nodo;
  };

  const filaDe = (texto) => {
    let nodo = botonPorTexto(texto);

    while (
      nodo &&
      StyleSheet.flatten(nodo.props.style)
        ?.flexDirection !== 'row'
    ) {
      nodo = nodo.parent;
    }

    return nodo;
  };

  const montar = (sobres = {}) => {
    act(() => {
      renderer = create(
        <ModalFormulario {...dataProps} {...sobres} />
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
  // CONTENIDO
  // =====================================================

  describe('contenido', () => {

    test('muestra el título', () => {
      montar();

      const texto =
        JSON.stringify(renderer.toJSON());

      expect(texto).toContain('Introduce cantidad');
    });

    test('renderiza el cuerpo que le pasan', () => {
      montar({
        children: <Text>LIN2-A01-Z01</Text>,
      });

      expect(JSON.stringify(renderer.toJSON()))
        .toContain('LIN2-A01-Z01');
    });


    // ===================================================
    // ESTILO COMPARTIDO
    // ===================================================
    //
    // Los dos modales de formulario vivían cada uno con
    // su propia copia del esqueleto, y ya se habían
    // separado: uno apilaba los botones y otro los ponía
    // en fila. Estos tests son lo que impide que vuelvan
    // a divergir.

    test('pone los dos botones en la misma fila', () => {
      montar();

      const filaConfirmar = filaDe('Confirmar');
      const filaCancelar = filaDe('Cancelar');

      expect(filaConfirmar).toBeTruthy();
      expect(filaCancelar).toBeTruthy();

      /* Comparten contenedor y no hay nada más dentro. */

      const estiloFila =
        StyleSheet.flatten(filaConfirmar.props.style);

      expect(estiloFila.flexDirection).toBe('row');
      expect(estiloFila.justifyContent)
        .toBe('space-between');
      expect(estiloFila.width).toBe('100%');

      expect(
        filaConfirmar.findAllByType(TouchableOpacity)
      ).toHaveLength(2);

      expect(
        filaCancelar.findAllByType(TouchableOpacity)
      ).toHaveLength(2);
    });

    test('el confirmar va relleno con el celeste de marca', () => {
      montar();

      const estilo = StyleSheet.flatten(
        botonPorTexto('Confirmar').props.style
      );

      expect(estilo.backgroundColor)
        .toBe(colors.primary);

      expect(estilo.borderColor)
        .toBe(colors.primary);
    });

    test('el cancelar va delineado en rojo, sin relleno', () => {
      montar();

      const estilo = StyleSheet.flatten(
        botonPorTexto('Cancelar').props.style
      );

      expect(estilo.backgroundColor)
        .toBe('#FFFFFF');

      expect(estilo.borderColor)
        .toBe(colors.danger);
    });

    test('ambos llevan borde para diferenciarlos', () => {

      montar();

      for (const texto of ['Confirmar', 'Cancelar']) {

        const estilo = StyleSheet.flatten(
          botonPorTexto(texto).props.style
        );

        expect(estilo.borderWidth).toBe(2);
      }
    });

    test('el texto de ambos botones es legible', () => {
      montar();

      /* El de confirmar es blanco sobre el celeste
         oscuro; el de cancelar, rojo sobre blanco. */

      const textos =
        renderer.root.findAllByType(Text);

      const confirmar = textos.find(
        (t) => String(textoDe(t)) === 'Confirmar'
      );
      const cancelar = textos.find(
        (t) => String(textoDe(t)) === 'Cancelar'
      );

      expect(
        StyleSheet.flatten(confirmar.props.style).color
      ).toBe(colors.onPrimary);

      expect(
        StyleSheet.flatten(cancelar.props.style).color
      ).toBe(colors.danger);
    });


    // ===================================================
    // ACCIONES
    // ===================================================

    test('confirmar avisa y cancelar cancela', () => {
      montar();

      presionarPorTexto('Confirmar');

      expect(dataProps.onConfirm)
        .toHaveBeenCalledTimes(1);
      expect(dataProps.onCancel)
        .not.toHaveBeenCalled();

      presionarPorTexto('Cancelar');

      expect(dataProps.onCancel)
        .toHaveBeenCalledTimes(1);
    });

    test('permite cambiar el texto del botón principal', () => {
      montar({ textoConfirmar: 'Aceptar' });

      const texto =
        JSON.stringify(renderer.toJSON());

      expect(texto).toContain('Aceptar');
      expect(texto).not.toContain('Confirmar');
    });

  });

});
import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

import ArticuloExistenteModal from '../../src/components/ArticuloExistenteModal';

describe('ArticuloExistenteModal', () => {

  let renderer;

  const props = {
    visible: true,
    articulo: '123456',
    ubicacion: 'LIN2-A01-Z01',
    cantidad: 5,
    onSumar: jest.fn(),
    onSobrescribir: jest.fn(),
    onCancelar: jest.fn(),
  };

  const montar = () => {
    act(() => {
      renderer = create(<ArticuloExistenteModal {...props} />);
    });
  };

  const textos = () =>
    renderer.root
      .findAllByType(Text)
      .map((t) => {
        const children = t.props.children;
        return Array.isArray(children)
          ? children.join('')
          : String(children);
      });

  const presionar = (testID) => {
    act(() => {
      renderer.root
        .findByProps({ testID })
        .props.onPress();
    });
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

    test('avisa con el artículo, la ubicación y la cantidad existente', () => {

      montar();

      const contenido = textos();

      expect(contenido).toContain('Artículo ya contado');

      const mensaje = contenido.find((t) =>
        t.startsWith('El artículo')
      );

      expect(mensaje).toContain('123456');
      expect(mensaje).toContain('LIN2-A01-Z01');
      expect(mensaje).toContain('5');

    });

    test('muestra descripción y unidad del artículo', () => {

      act(() => {
        renderer = create(
          <ArticuloExistenteModal
            {...props}
            descripcion="Tornillo hexagonal"
            unidad="UD"
          />
        );
      });

      const contenido = textos();

      expect(contenido).toContain(
        'Descripción: Tornillo hexagonal'
      );
      expect(contenido).toContain('Unidad: UD');
    });

    test('usa un guion si no hay descripción ni unidad', () => {

      montar();

      const contenido = textos();

      expect(contenido).toContain('Descripción: —');
      expect(contenido).toContain('Unidad: —');
    });

  });


  // =====================================================
  // ACCIONES
  // =====================================================

  describe('acciones', () => {

    test('el botón Sumar llama a onSumar', () => {

      montar();
      presionar('btn-sumar');

      expect(props.onSumar).toHaveBeenCalledTimes(1);
      expect(props.onSobrescribir).not.toHaveBeenCalled();
      expect(props.onCancelar).not.toHaveBeenCalled();

    });

    test('el botón Sobrescribir llama a onSobrescribir', () => {

      montar();
      presionar('btn-sobrescribir');

      expect(props.onSobrescribir).toHaveBeenCalledTimes(1);
      expect(props.onSumar).not.toHaveBeenCalled();
      expect(props.onCancelar).not.toHaveBeenCalled();

    });

    test('el botón Cancelar llama a onCancelar', () => {

      montar();
      presionar('btn-cancelar-existente');

      expect(props.onCancelar).toHaveBeenCalledTimes(1);
      expect(props.onSumar).not.toHaveBeenCalled();
      expect(props.onSobrescribir).not.toHaveBeenCalled();

    });

  });

});
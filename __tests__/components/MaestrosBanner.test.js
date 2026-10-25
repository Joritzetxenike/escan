import React from 'react';
import { create, act } from 'react-test-renderer';

import MaestrosBanner from '../../src/components/MaestrosBanner';

/* =======================================================
 * COPIA LOCAL DEL MAESTRO
 * ======================================================= */

jest.mock('../../src/logic/useMaestros', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

const useMaestros =
  require('../../src/logic/useMaestros').default;

const BASE_MAESTROS = {
  hayCopia: true,
  descargando: false,
  descargandoQue: null,
  pideActualizar: false,
  error: null,
  viejo: false,
  peligroso: false,
  antiguedadTexto: 'hace 2 h',
  actualizar: jest.fn(),
  aplazar: jest.fn(),
};

const renderCon = (maestros = {}) => {
  useMaestros.mockReturnValue({ ...BASE_MAESTROS, ...maestros });

  let renderer;

  act(() => {
    renderer = create(<MaestrosBanner />);
  });

  return renderer;
};

const textoDe = (renderer) =>
  JSON.stringify(renderer.toJSON());

describe('MaestrosBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  // =====================================================
  // SIN COPIA: BLOQUEA LA VALIDACIÓN
  // =====================================================

  describe('sin copia', () => {

    test('avisa de que hace falta descargar', () => {
      const renderer = renderCon({ hayCopia: false });

      expect(textoDe(renderer)).toContain('Sin copia del maestro');

      expect(textoDe(renderer)).toContain('conéctate');
    });

    test('solo ofrece actualizar, no aplazar', () => {
      const renderer = renderCon({ hayCopia: false });

      const testIDs = textoDe(renderer);

      expect(testIDs).toContain('maestros-actualizar');

      expect(testIDs).not.toContain('maestros-aplazar');
    });

  });


  // =====================================================
  // DESCARGANDO
  // =====================================================

  describe('descargando', () => {

    test('informa de los artículos', () => {
      const renderer = renderCon({
        descargando: true,
        descargandoQue: 'articulos',
      });

      expect(textoDe(renderer)).toContain(
        'Descargando el maestro de artículos'
      );
    });

    test('informa de las ubicaciones', () => {
      const renderer = renderCon({
        descargando: true,
        descargandoQue: 'ubicaciones',
      });

      expect(textoDe(renderer)).toContain(
        'Descargando las ubicaciones'
      );
    });

    test('no ofrece botones mientras baja', () => {
      const renderer = renderCon({ descargando: true });

      const testIDs = textoDe(renderer);

      expect(testIDs).not.toContain('maestros-actualizar');
      expect(testIDs).not.toContain('maestros-aplazar');
    });

  });


  // =====================================================
  // ERROR DE DESCARGA DEL MAESTRO
  // =====================================================

  describe('error al bajar el maestro', () => {

    test('muestra el motivo y ofrece reintentar la descarga', () => {
      const renderer = renderCon({ error: 'Timeout' });

      expect(textoDe(renderer)).toContain(
        'No se pudo actualizar el maestro'
      );

      expect(textoDe(renderer)).toContain('Timeout');

      expect(textoDe(renderer)).toContain('maestros-actualizar');
    });

  });


  // =====================================================
  // MAESTRO VIEJO: DECIDE EL OPERARIO
  // =====================================================

  describe('maestro viejo', () => {

    test('pregunta y ofrece actualizar o aplazar', () => {
      const renderer = renderCon({
        pideActualizar: true,
        viejo: true,
      });

      expect(textoDe(renderer)).toContain('Pendiente de actualizar');
      expect(textoDe(renderer)).toContain('hace 2 h');

      const testIDs = textoDe(renderer);

      expect(testIDs).toContain('maestros-actualizar');
      expect(testIDs).toContain('maestros-aplazar');
    });

    test('si se aplaza, solo queda el botón de actualizar', () => {
      const renderer = renderCon({
        pideActualizar: false,
        viejo: true,
      });

      expect(textoDe(renderer)).toContain('Pendiente de actualizar');
      expect(textoDe(renderer)).toContain('hace 2 h');

      const testIDs = textoDe(renderer);

      expect(testIDs).toContain('maestros-actualizar');
      expect(testIDs).not.toContain('maestros-aplazar');
    });

    test('si la copia es muy vieja, avisa del riesgo', () => {
      const renderer = renderCon({
        pideActualizar: true,
        viejo: true,
        peligroso: true,
        antiguedadTexto: 'hace 12 días',
      });

      expect(textoDe(renderer)).toContain('Pendiente de actualizar');

      expect(textoDe(renderer)).toContain(
        'puede estar rechazando artículos nuevos'
      );
    });

  });


  // =====================================================
  // TODO BIEN
  // =====================================================

  describe('todo en orden', () => {

    test('confirma que la copia está sincronizada', () => {
      const renderer = renderCon();

      expect(textoDe(renderer)).toContain('Sincronizado');

      expect(textoDe(renderer)).toContain('hace 2 h');

      expect(textoDe(renderer)).not.toContain('Pendiente de actualizar');
    });

    test('el botón de actualizar sigue disponible', () => {
      const renderer = renderCon();

      const testIDs = textoDe(renderer);

      expect(testIDs).toContain('maestros-actualizar');

      expect(textoDe(renderer)).toContain('Actualizar');
    });

    test('no ofrece aplazar si no hay nada que decidir', () => {
      const renderer = renderCon();

      expect(textoDe(renderer)).not.toContain('maestros-aplazar');
    });

  });


  // =====================================================
  // ACCIONES
  // =====================================================

  describe('acciones', () => {

    const pulsar = (renderer, testID) => {
      renderer.root
        .findByProps({ testID })
        .props.onPress();
    };

    test('"Actualizar" baja el maestro', () => {
      const actualizar = jest.fn();

      const renderer = renderCon({ actualizar });

      pulsar(renderer, 'maestros-actualizar');

      expect(actualizar).toHaveBeenCalled();
    });

    test('"Ahora no" aplaza la actualización', () => {
      const aplazar = jest.fn();

      const renderer = renderCon({
        pideActualizar: true,
        viejo: true,
        aplazar,
      });

      pulsar(renderer, 'maestros-aplazar');

      expect(aplazar).toHaveBeenCalled();
    });

  });

});

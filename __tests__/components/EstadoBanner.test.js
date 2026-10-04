import React from 'react';
import { create, act } from 'react-test-renderer';

import EstadoBanner from '../../src/components/EstadoBanner';

/* =======================================================
 * FRANJA ÚNICA DE ESTADO
 * ======================================================= */

jest.mock('../../src/logic/useMaestros', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../src/logic/useConectividad', () => ({
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

const useConectividad =
  require('../../src/logic/useConectividad').default;

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

const BASE_CONECTIVIDAD = {
  online: true,
  comprobando: false,
  sincronizando: false,
  pendientes: 0,
  ultimoIntento: null,
  ultimoError: null,
  reintentar: jest.fn(),
};

const renderCon = (maestros = {}, conectividad = {}) => {
  useMaestros.mockReturnValue({ ...BASE_MAESTROS, ...maestros });

  useConectividad.mockReturnValue({
    ...BASE_CONECTIVIDAD,
    ...conectividad,
  });

  let renderer;

  act(() => {
    renderer = create(<EstadoBanner />);
  });

  return renderer;
};

const textoDe = (renderer) =>
  JSON.stringify(renderer.toJSON());

describe('EstadoBanner', () => {
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

    /* Aunque no haya red, esto es lo más urgente: sin copia
       no se valida ningún código. El aviso ya pide conectar. */

    test('tiene prioridad sobre "sin conexión"', () => {
      const renderer = renderCon(
        { hayCopia: false },
        { online: false, pendientes: 4 }
      );

      expect(textoDe(renderer)).toContain('Sin copia del maestro');

      expect(textoDe(renderer)).not.toContain('Sin conexión');
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
  // CONECTIVIDAD
  // =====================================================

  describe('sin conexión', () => {

    test('indica cuántos cambios quedan en la cola', () => {
      const renderer = renderCon(
        {},
        { online: false, pendientes: 3 }
      );

      expect(textoDe(renderer)).toContain('Sin conexión');

      expect(textoDe(renderer)).toContain('3 cambios pendientes');
    });

    test('el singular no dice "cambios"', () => {
      const renderer = renderCon(
        {},
        { online: false, pendientes: 1 }
      );

      expect(textoDe(renderer)).toContain('1 cambio pendiente');
    });

    test('ofrece reintentar, no actualizar el maestro', () => {
      const renderer = renderCon(
        {},
        { online: false }
      );

      const testIDs = textoDe(renderer);

      expect(testIDs).toContain('reintentar-sincronizacion');

      expect(testIDs).not.toContain('maestros-actualizar');
    });

  });


  // =====================================================
  // ERROR DE SINCRONIZACIÓN
  // =====================================================

  describe('error al sincronizar', () => {

    test('muestra el motivo y ofrece reintentar', () => {
      const renderer = renderCon(
        {},
        { ultimoError: { mensaje: 'Network request failed' } }
      );

      expect(textoDe(renderer)).toContain(
        'Error al sincronizar'
      );

      expect(textoDe(renderer)).toContain('Network request failed');

      expect(textoDe(renderer)).toContain('reintentar-sincronizacion');
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
  // SINCRONIZANDO
  // =====================================================

  describe('sincronizando', () => {

    test('lo indica', () => {
      const renderer = renderCon({}, { sincronizando: true });

      expect(textoDe(renderer)).toContain('Sincronizando');
    });

    test('no ofrece botones', () => {
      const renderer = renderCon({}, { sincronizando: true });

      const testIDs = textoDe(renderer);

      expect(testIDs).not.toContain('maestros-actualizar');
      expect(testIDs).not.toContain('reintentar-sincronizacion');
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

      expect(textoDe(renderer)).toContain(
        'puede estar rechazando artículos nuevos'
      );
    });

  });


  // =====================================================
  // TODO BIEN
  // =====================================================

  describe('todo en orden', () => {

    test('confirma que está sincronizado y el maestro al día', () => {
      const renderer = renderCon();

      expect(textoDe(renderer)).toContain('Sincronizado');

      expect(textoDe(renderer)).toContain('Maestro al día');
    });

    /* Regresión: con la copia al día el banner devolvía
       null y el operario se quedaba sin forma de forzar la
       descarga hasta que la copia cumplía 24 h. */

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

    test('muestra la hora de la última sincronización', () => {
      const renderer = renderCon(
        {},
        {
          ultimoIntento: new Date(2026, 0, 1, 14, 30),
        }
      );

      expect(textoDe(renderer)).toContain('14:30');
    });

    test('si quedan cambios, dice que los está enviando', () => {
      const renderer = renderCon({}, { pendientes: 2 });

      expect(textoDe(renderer)).toContain('Sincronizando');

      expect(textoDe(renderer)).toContain('2 cambios pendientes');
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

    test('"Reintentar" relanza la comprobación', () => {
      const reintentar = jest.fn();

      const renderer = renderCon(
        {},
        { online: false, reintentar }
      );

      pulsar(renderer, 'reintentar-sincronizacion');

      expect(reintentar).toHaveBeenCalled();
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
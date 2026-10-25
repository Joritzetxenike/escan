import React from 'react';
import { create, act } from 'react-test-renderer';

import EstadoBanner from '../../src/components/EstadoBanner';

/* =======================================================
 * FRANJA DE CONEXIÓN Y COLA DE PENDIENTES
 * ======================================================= */

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

const useConectividad =
  require('../../src/logic/useConectividad').default;

const BASE_CONECTIVIDAD = {
  online: true,
  comprobando: false,
  sincronizando: false,
  pendientes: 0,
  ultimoIntento: null,
  ultimoError: null,
  reintentar: jest.fn(),
};

const renderCon = (conectividad = {}, props = {}) => {
  useConectividad.mockReturnValue({
    ...BASE_CONECTIVIDAD,
    ...conectividad,
  });

  let renderer;

  act(() => {
    renderer = create(<EstadoBanner {...props} />);
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
  // SIN CONEXIÓN
  // =====================================================

  describe('sin conexión', () => {

    test('indica cuántos cambios quedan en la cola', () => {
      const renderer = renderCon({
        online: false,
        pendientes: 3,
      });

      expect(textoDe(renderer)).toContain('Sin conexión');

      expect(textoDe(renderer)).toContain('3 cambios pendientes');
    });

    test('el singular no dice "cambios"', () => {
      const renderer = renderCon({
        online: false,
        pendientes: 1,
      });

      expect(textoDe(renderer)).toContain('1 cambio pendiente');
    });

    test('ofrece reintentar, no actualizar el maestro', () => {
      const renderer = renderCon({ online: false });

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
      const renderer = renderCon({
        ultimoError: { mensaje: 'Network request failed' },
      });

      expect(textoDe(renderer)).toContain(
        'Error al sincronizar'
      );

      expect(textoDe(renderer)).toContain('Network request failed');

      expect(textoDe(renderer)).toContain('reintentar-sincronizacion');
    });

  });


  // =====================================================
  // SINCRONIZANDO
  // =====================================================

  describe('sincronizando', () => {

    test('lo indica', () => {
      const renderer = renderCon({ sincronizando: true });

      expect(textoDe(renderer)).toContain('Sincronizando');
    });

    test('no ofrece botones', () => {
      const renderer = renderCon({ sincronizando: true });

      const testIDs = textoDe(renderer);

      expect(testIDs).not.toContain('maestros-actualizar');
      expect(testIDs).not.toContain('reintentar-sincronizacion');
    });

  });


  // =====================================================
  // TODO BIEN
  // =====================================================

  describe('todo en orden', () => {

    test('confirma que está sincronizado', () => {
      const renderer = renderCon();

      expect(textoDe(renderer)).toContain('Sincronizado');
    });

    test('muestra la hora de la última sincronización', () => {
      const renderer = renderCon({
        ultimoIntento: new Date(2026, 0, 1, 14, 30),
      });

      expect(textoDe(renderer)).toContain('14:30');
    });

    test('si quedan cambios, dice que los está enviando', () => {
      const renderer = renderCon({ pendientes: 2 });

      expect(textoDe(renderer)).toContain('Sincronizando');

      expect(textoDe(renderer)).toContain('2 cambios pendientes');
    });

    test('no ofrece el actualizador del maestro', () => {
      const renderer = renderCon();

      expect(textoDe(renderer)).not.toContain('maestros-actualizar');
    });

  });


  // =====================================================
  // SOLO AVISOS (HOME Y LISTA)
  // =====================================================

  describe('solo avisos', () => {

    test('oculta el estado "todo bien"', () => {
      const renderer = renderCon({}, { soloAvisos: true });

      expect(renderer.toJSON()).toBeNull();
    });

    test('mantiene el aviso de sin conexión', () => {
      const renderer = renderCon(
        { online: false, pendientes: 2 },
        { soloAvisos: true }
      );

      expect(textoDe(renderer)).toContain('Sin conexión');
    });

    test('mantiene el error de sincronización', () => {
      const renderer = renderCon(
        { ultimoError: { mensaje: 'Network request failed' } },
        { soloAvisos: true }
      );

      expect(textoDe(renderer)).toContain('Error al sincronizar');
    });

    test('mantiene el estado sincronizando', () => {
      const renderer = renderCon(
        { sincronizando: true },
        { soloAvisos: true }
      );

      expect(textoDe(renderer)).toContain('Sincronizando');
    });

    test('avisa si quedan cambios pendientes', () => {
      const renderer = renderCon(
        { pendientes: 2 },
        { soloAvisos: true }
      );

      expect(textoDe(renderer)).toContain('2 cambios pendientes');
    });

  });


  // =====================================================
  // ACCIONES
  // =====================================================

  describe('acciones', () => {

    test('"Reintentar" relanza la comprobación', () => {
      const reintentar = jest.fn();

      const renderer = renderCon({
        online: false,
        reintentar,
      });

      renderer.root
        .findByProps({ testID: 'reintentar-sincronizacion' })
        .props.onPress();

      expect(reintentar).toHaveBeenCalled();
    });

  });

});

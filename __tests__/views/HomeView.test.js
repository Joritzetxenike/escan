import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

import HomeView from '../../src/views/HomeView';

/* Solo interesa la vista: los modales y el banner se simulan. */
jest.mock('../../src/components/CantidadModal', () => () => null);
jest.mock('../../src/components/ArticuloExistenteModal', () => () => null);
jest.mock('../../src/components/ManualCodeModal', () => () => null);
jest.mock('../../src/components/EstadoBanner', () => () => null);
jest.mock('../../src/components/PlanosModal', () => () => null);

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

describe('HomeView · últimos artículos', () => {

  let renderer;

  const textos = () =>
    renderer.root.findAllByType(Text).map((t) => {
      const c = t.props.children;
      return Array.isArray(c) ? c.join('') : c;
    });

  const montar = async (ultimosArticulos) => {
    await act(async () => {
      renderer = create(
        <HomeView
          state={{ ubicacion: 'CARP-A01-Z05', ultimosArticulos }}
          actions={{}}
        />
      );
    });
  };

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });

  test('cada fila enseña código, descripción, cantidad y unidad', async () => {
    await montar([
      { articulo: '-BXC05.4010 -SUB', cantidad: 12, unidad: 'U', descripcion: 'SUB-C.KIT ESTANT' },
      { articulo: '0800715004', cantidad: 3, unidad: 'M2', descripcion: 'TUBO 1/4X600' },
    ]);

    const t = textos();

    expect(t).toContain('-BXC05.4010 -SUB');
    expect(t).toContain('12 U');
    expect(t).toContain('0800715004');
    expect(t).toContain('3 M2');

    expect(t).toContain('SUB-C.KIT ESTANT');
    expect(t).toContain('TUBO 1/4X600');

    /* La descripción va en una sola línea */
    const desc = renderer.root
      .findAllByType(Text)
      .find((n) => n.props.children === 'SUB-C.KIT ESTANT');
    expect(desc.props.numberOfLines).toBe(1);
  });

  test('sin descripción no deja una línea vacía', async () => {
    await montar([{ articulo: 'ABC', cantidad: 5, unidad: 'U', descripcion: '' }]);

    const fila = renderer.root.findByProps({ testID: 'ultimo-0' });
    expect(fila.findAllByType(Text)).toHaveLength(2);
  });

  test('sin unidad solo muestra la cantidad', async () => {
    await montar([{ articulo: 'ABC', cantidad: 5, unidad: '' }]);

    expect(textos()).toContain('5');
  });

  test('marca los que aún no se han enviado', async () => {
    await montar([
      { articulo: 'ABC', cantidad: 5, unidad: 'U', pendiente: true },
      { articulo: 'DEF', cantidad: 1, unidad: 'U', pendiente: false },
    ]);

    expect(textos().filter((x) => x === 'Pendiente de enviar')).toHaveLength(1);
  });

});

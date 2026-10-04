import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

import EstadoResumen from '../../src/components/EstadoResumen';
import { resumirEstados } from '../../src/helpers/estadosResumenHelper';

/* =======================================================
 * RESUMEN DE ESTADOS (presentacional)
 * ======================================================= */

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

const ARBOL = [
  {
    seccion: 'LIN2',
    stat: 'Fin',
    maestroArea: [
      {
        area: 'A01',
        stat: 'Fin',
        maestroUbicacion: [
          { subzona: 'Z01', stat: 'Fin' },
          { subzona: 'Z02', stat: 'Inicio' },
        ],
      },
    ],
  },
];

const resumenDe = (arbol) => resumirEstados(arbol);

const renderCon = (props) => {
  let renderer;

  act(() => {
    renderer = create(
      <EstadoResumen
        cargando={false}
        error={false}
        onReintentar={jest.fn()}
        {...props}
      />
    );
  });

  return renderer;
};

const textoDe = (nodo) => {
  const children = nodo.props.children;
  return Array.isArray(children) ? children.join('') : children;
};

const textosVisibles = (renderer) =>
  renderer.root.findAllByType(Text).map((t) => String(textoDe(t)));

describe('EstadoResumen', () => {

  test('muestra totales y porcentajes por estado', () => {
    const renderer = renderCon({ resumen: resumenDe(ARBOL) });

    const textos = textosVisibles(renderer);

    expect(textos).toContain('Secciones');
    expect(textos).toContain('Total: 1');
    expect(textos).toContain('Áreas');
    expect(textos).toContain('Total: 1');
    expect(textos).toContain('Ubicaciones');
    expect(textos).toContain('Total: 2');

    // Ubicaciones: 1 Fin de 2 => 50%, 1 Inicio de 2 => 50%
    expect(
      textos.filter((t) => t === '50%').length
    ).toBeGreaterThanOrEqual(2);

    expect(textos).toContain('Fin');
    expect(textos).toContain('Inicio');
    expect(textos).toContain('Proceso');
  });

  test('muestra "Sin datos" si el árbol está vacío', () => {
    const renderer = renderCon({ resumen: resumenDe([]) });

    expect(textosVisibles(renderer)).toContain('Sin datos');
  });

  test('muestra el spinner mientras carga', () => {
    const renderer = renderCon({ cargando: true, resumen: null });

    expect(textosVisibles(renderer)).toHaveLength(0);
  });

  test('ofrece reintentar si falla la carga', () => {
    const onReintentar = jest.fn();

    const renderer = renderCon({ error: true, onReintentar });

    expect(textosVisibles(renderer)).toContain(
      'No se pudieron cargar los estados'
    );

    act(() => {
      renderer.root
        .findByProps({ testID: 'reintentar-resumen' })
        .props.onPress();
    });

    expect(onReintentar).toHaveBeenCalled();
  });

  test('no revienta si todavía no hay datos', () => {
    const renderer = renderCon({ resumen: null });

    expect(
      renderer.root.findAllByType(TouchableOpacity).length
    ).toBe(0);
  });

});
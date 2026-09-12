import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

import EstadosResumenScreen from '../../src/screens/EstadosResumenScreen';
import { obtenerEstadoUbicaciones } from '../../src/services/ubicacionesService';

jest.mock('../../src/services/ubicacionesService', () => ({
  obtenerEstadoUbicaciones: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

describe('EstadosResumenScreen', () => {

  let renderer;
  const mockNavigation = { goBack: jest.fn() };

  const textoDe = (nodo) => {
    const children = nodo.props.children;
    return Array.isArray(children) ? children.join('') : children;
  };

  const textosVisibles = () =>
    renderer.root.findAllByType(Text).map((t) => String(textoDe(t)));

  const montar = async () => {
    await act(async () => {
      renderer = create(
        <EstadosResumenScreen navigation={mockNavigation} />
      );
      await Promise.resolve();
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

  test('muestra totales y porcentajes por estado', async () => {
    obtenerEstadoUbicaciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Fin',
        maestroArea: [
          {
            area: '111',
            stat: 'Fin',
            maestroUbicacion: [
              { subzona: 'Z101', stat: 'Fin' },
              { subzona: 'Z102', stat: 'Inicio' },
            ],
          },
        ],
      },
    ]);

    await montar();

    const textos = textosVisibles();

    expect(textos).toContain('Secciones');
    expect(textos).toContain('Total: 1');
    expect(textos).toContain('Áreas');
    expect(textos).toContain('Total: 1');
    expect(textos).toContain('Ubicaciones');
    expect(textos).toContain('Total: 2');

    // Ubicaciones: 1 Fin de 2 => 50%, 1 Inicio de 2 => 50%
    expect(textos.filter((t) => t === '50%').length).toBeGreaterThanOrEqual(2);
    expect(textos).toContain('Fin');
    expect(textos).toContain('Inicio');
    expect(textos).toContain('Proceso');
  });

  test('muestra "Sin datos" si el árbol está vacío', async () => {
    obtenerEstadoUbicaciones.mockResolvedValue([]);

    await montar();

    expect(textosVisibles()).toContain('Sin datos');
  });

  test('permite reintentar si falla la carga', async () => {
    obtenerEstadoUbicaciones.mockRejectedValueOnce(
      new Error('Error de red')
    );

    await montar();

    expect(textosVisibles()).toContain('No se pudieron cargar los estados');

    obtenerEstadoUbicaciones.mockResolvedValueOnce([]);

    // Pulsar "Reintentar"
    const textos = renderer.root.findAllByType(Text);
    const match = textos.find((t) => String(textoDe(t)) === 'Reintentar');
    expect(match).toBeTruthy();

    let nodo = match.parent;
    while (nodo && typeof nodo.props?.onPress !== 'function') {
      nodo = nodo.parent;
    }

    await act(async () => {
      nodo.props.onPress();
      await Promise.resolve();
    });

    expect(obtenerEstadoUbicaciones).toHaveBeenCalledTimes(2);
    expect(textosVisibles()).toContain('Sin datos');
  });

});
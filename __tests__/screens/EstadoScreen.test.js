import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import EstadoScreen from '../../src/screens/EstadoScreen';
import { obtenerUbicaciones } from '../../src/services/ubicacionesService';
import InventoryService from '../../src/services/InventoryService';

jest.mock('../../src/services/ubicacionesService', () => ({
  obtenerUbicaciones: jest.fn(),
}));

jest.mock('../../src/services/InventoryService', () => ({
  cargarUbicacion: jest.fn(),
}));

jest.mock('../../src/components/ArticulosModal', () => () => null);

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('EstadoScreen', () => {

  let renderer;
  const mockNavigation = { setOptions: jest.fn() };

  const textoDe = (nodo) => {
    const children = nodo.props.children;
    return Array.isArray(children) ? children.join('') : children;
  };

  const presionarPorTexto = (texto) => {
    const textos = renderer.root.findAllByType(Text);
    const match = textos.find((t) => textoDe(t) === texto);
    expect(match).toBeTruthy();

    let nodo = match.parent;
    while (nodo && typeof nodo.props?.onPress !== 'function') {
      nodo = nodo.parent;
    }

    expect(nodo).toBeTruthy();
    nodo.props.onPress();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      renderer = create(<EstadoScreen navigation={mockNavigation} />);
    });
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });

  // =====================================================
  // Carga bajo demanda
  // =====================================================

  test('no hace peticiones al montar la pantalla', () => {
    expect(obtenerUbicaciones).not.toHaveBeenCalled();
  });

  test('carga la estructura al pulsar "Cargar ubicaciones"', async () => {
    obtenerUbicaciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
        areas: [],
      },
    ]);

    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });

    expect(obtenerUbicaciones).toHaveBeenCalledTimes(1);

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'Sección 50100')
    ).toBe(true);
  });

  test('el botón de recarga de la cabecera vuelve a pedir los datos', async () => {
    obtenerUbicaciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
        areas: [],
      },
    ]);

    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });

    // El botón de recarga se registra en la cabecera nativa (headerRight)
    const ultimoSetOptions =
      mockNavigation.setOptions.mock.calls.at(-1)[0];
    const headerRight = ultimoSetOptions.headerRight();
    const onPress = headerRight.props.onPress;

    await act(async () => {
      onPress();
    });

    expect(obtenerUbicaciones).toHaveBeenCalledTimes(2);
  });

  test('muestra un alert si la carga falla y permite reintentar', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    obtenerUbicaciones.mockRejectedValue(
      new Error('Error de red')
    );

    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });

    expect(spyAlert).toHaveBeenCalledWith(
      'Error',
      'No se pudieron cargar las ubicaciones'
    );

    // Sigue mostrando el botón para reintentar
    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => t.props.children === 'Cargar ubicaciones')
    ).toBe(true);

    spyAlert.mockRestore();
  });

  // =====================================================
  // Artículos por ubicación
  // =====================================================

  test('carga los artículos solo al tocar una ubicación', async () => {
    obtenerUbicaciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
        areas: [
          {
            area: '111',
            stat: 'Inicio',
            ubicaciones: [
              { subzona: 'Z101', stat: 'Inicio', ubicacion: '50100-111-Z101' },
            ],
          },
        ],
      },
    ]);

    InventoryService.cargarUbicacion.mockResolvedValue([]);

    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });

    // Sin tocar nada, no se pide ningún artículo
    expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();

    // Abrir sección y área para llegar hasta la ubicación
    await act(async () => {
      presionarPorTexto('Sección 50100');
    });
    await act(async () => {
      presionarPorTexto('Área 111');
    });

    await act(async () => {
      presionarPorTexto('50100-111-Z101');
    });

    expect(InventoryService.cargarUbicacion)
      .toHaveBeenCalledWith('50100-111-Z101');
  });

});

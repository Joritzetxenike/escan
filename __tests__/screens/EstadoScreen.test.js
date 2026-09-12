import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import EstadoScreen from '../../src/screens/EstadoScreen';
import {
  obtenerSecciones,
  obtenerAreas,
  obtenerUbicacionesDeArea,
} from '../../src/services/ubicacionesService';
import InventoryService from '../../src/services/InventoryService';

jest.mock('../../src/services/ubicacionesService', () => ({
  obtenerSecciones: jest.fn(),
  obtenerAreas: jest.fn(),
  obtenerUbicacionesDeArea: jest.fn(),
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

  const cargarSecciones = async () => {
    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });
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
  // Carga bajo demanda (por niveles)
  // =====================================================

  test('no hace peticiones al montar la pantalla', () => {
    expect(obtenerSecciones).not.toHaveBeenCalled();
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();
  });

  test('carga solo las secciones al pulsar "Cargar ubicaciones"', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
      },
    ]);

    await cargarSecciones();

    expect(obtenerSecciones).toHaveBeenCalledTimes(1);
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'Sección 50100')
    ).toBe(true);
  });

  test('el botón de recarga de la cabecera vuelve a pedir las secciones', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
      },
    ]);

    await cargarSecciones();

    const ultimoSetOptions =
      mockNavigation.setOptions.mock.calls.at(-1)[0];
    const headerRight = ultimoSetOptions.headerRight();
    const onPress = headerRight.props.onPress;

    await act(async () => {
      onPress();
    });

    expect(obtenerSecciones).toHaveBeenCalledTimes(2);
  });

  test('muestra un alert si la carga falla y permite reintentar', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    obtenerSecciones.mockRejectedValue(
      new Error('Error de red')
    );

    await cargarSecciones();

    expect(spyAlert).toHaveBeenCalledWith(
      'Error',
      'No se pudieron cargar las ubicaciones'
    );

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => t.props.children === 'Cargar ubicaciones')
    ).toBe(true);

    spyAlert.mockRestore();
  });

  // =====================================================
  // Carga de áreas y ubicaciones al expandir
  // =====================================================

  test('carga las áreas solo al expandir una sección', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: '111',
        stat: 'Inicio',
      },
    ]);

    await cargarSecciones();

    // Sin expandir, no se piden áreas ni ubicaciones
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();

    await act(async () => {
      presionarPorTexto('Sección 50100');
    });

    expect(obtenerAreas).toHaveBeenCalledWith('50100');
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();
    expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'Área 111')
    ).toBe(true);
  });

  test('carga las ubicaciones solo al expandir un área, sin artículos', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: '111',
        stat: 'Inicio',
      },
    ]);

    obtenerUbicacionesDeArea.mockResolvedValue([
      {
        subzona: 'Z101',
        stat: 'Inicio',
        ubicacion: '50100-111-Z101',
      },
    ]);

    await cargarSecciones();

    await act(async () => {
      presionarPorTexto('Sección 50100');
    });
    await act(async () => {
      presionarPorTexto('Área 111');
    });

    expect(obtenerUbicacionesDeArea)
      .toHaveBeenCalledWith('50100', '111');

    // Aún no se cargan los artículos
    expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === '50100-111-Z101')
    ).toBe(true);
  });

  test('carga los artículos solo al tocar una ubicación', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: '50100',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: '111',
        stat: 'Inicio',
      },
    ]);

    obtenerUbicacionesDeArea.mockResolvedValue([
      {
        subzona: 'Z101',
        stat: 'Inicio',
        ubicacion: '50100-111-Z101',
      },
    ]);

    InventoryService.cargarUbicacion.mockResolvedValue([]);

    await cargarSecciones();
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
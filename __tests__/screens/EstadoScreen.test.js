import React from 'react';
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';

import EstadoScreen from '../../src/screens/EstadoScreen';
import {
  obtenerSecciones,
  obtenerAreas,
  obtenerUbicacionesDeArea,
  obtenerEstadoUbicaciones,
} from '../../src/services/ubicacionesService';
import InventoryService from '../../src/services/InventoryService';

jest.mock('../../src/services/ubicacionesService', () => ({
  obtenerSecciones: jest.fn(),
  obtenerAreas: jest.fn(),
  obtenerUbicacionesDeArea: jest.fn(),
  obtenerEstadoUbicaciones: jest.fn(),
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

  /* La pantalla entra en el resumen, así que todo lo de la
     lista hay que ir a buscarlo. */

  const irALista = async () => {
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'vista-lista' })
        .props.onPress();
    });
  };

  const cargarSecciones = async () => {
    await irALista();

    await act(async () => {
      presionarPorTexto('Cargar ubicaciones');
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    obtenerEstadoUbicaciones.mockResolvedValue([]);

    await act(async () => {
      renderer = create(<EstadoScreen navigation={mockNavigation} />);
    });
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });

  // =====================================================
  // Vista por defecto: el resumen
  // =====================================================

  test('entra en el resumen y pide solo el resumen', async () => {
    expect(obtenerEstadoUbicaciones).toHaveBeenCalledTimes(1);

    expect(obtenerSecciones).not.toHaveBeenCalled();
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();

    expect(
      renderer.root.findAllByProps({ testID: 'vista-resumen' }).length
    ).toBeGreaterThan(0);
  });

  test('enseña los totales del resumen', async () => {
    /* El mock se cambia después del montaje, así que hay que
       recargar para que el resumen reciba el árbol nuevo. */

    obtenerEstadoUbicaciones.mockResolvedValue([
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
    ]);

    const ultimoSetOptions =
      mockNavigation.setOptions.mock.calls.at(-1)[0];

    await act(async () => {
      ultimoSetOptions.headerRight().props.onPress();
    });

    const textos = renderer.root
      .findAllByType(Text)
      .map((t) => String(textoDe(t)));

    expect(textos).toContain('Secciones');
    expect(textos).toContain('Ubicaciones');
    expect(textos).toContain('Total: 2');
  });

  test('la lista no se pide hasta que se elige esa vista', async () => {
    await irALista();

    expect(obtenerSecciones).not.toHaveBeenCalled();
  });

  test('el botón de recarga recarga la vista activa', async () => {
    const ultimoSetOptions =
      mockNavigation.setOptions.mock.calls.at(-1)[0];

    await act(async () => {
      ultimoSetOptions.headerRight().props.onPress();
    });

    expect(obtenerEstadoUbicaciones).toHaveBeenCalledTimes(2);
    expect(obtenerSecciones).not.toHaveBeenCalled();
  });


  // =====================================================
  // Carga bajo demanda (por niveles)
  // =====================================================

  test('carga solo las secciones al pulsar "Cargar ubicaciones"', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: 'LIN2',
        stat: 'Inicio',
      },
    ]);

    await cargarSecciones();

    expect(obtenerSecciones).toHaveBeenCalledTimes(1);
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'Sección LIN2')
    ).toBe(true);
  });

  test('el botón de recarga de la cabecera vuelve a pedir las secciones', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: 'LIN2',
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
        seccion: 'LIN2',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: 'A01',
        stat: 'Inicio',
      },
    ]);

    await cargarSecciones();

    // Sin expandir, no se piden áreas ni ubicaciones
    expect(obtenerAreas).not.toHaveBeenCalled();
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();

    await act(async () => {
      presionarPorTexto('Sección LIN2');
    });

    expect(obtenerAreas).toHaveBeenCalledWith('LIN2');
    expect(obtenerUbicacionesDeArea).not.toHaveBeenCalled();
    expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'Área A01')
    ).toBe(true);
  });

  test('carga las ubicaciones solo al expandir un área, sin artículos', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: 'LIN2',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: 'A01',
        stat: 'Inicio',
      },
    ]);

    obtenerUbicacionesDeArea.mockResolvedValue([
      {
        subzona: 'Z01',
        stat: 'Inicio',
        ubicacion: 'LIN2-A01-Z01',
      },
    ]);

    await cargarSecciones();

    await act(async () => {
      presionarPorTexto('Sección LIN2');
    });
    await act(async () => {
      presionarPorTexto('Área A01');
    });

    expect(obtenerUbicacionesDeArea)
      .toHaveBeenCalledWith('LIN2', 'A01');

    // Aún no se cargan los artículos
    expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();

    const textos = renderer.root.findAllByType(Text);
    expect(
      textos.some((t) => textoDe(t) === 'LIN2-A01-Z01')
    ).toBe(true);
  });

  test('carga los artículos solo al tocar una ubicación', async () => {
    obtenerSecciones.mockResolvedValue([
      {
        seccion: 'LIN2',
        stat: 'Inicio',
      },
    ]);

    obtenerAreas.mockResolvedValue([
      {
        area: 'A01',
        stat: 'Inicio',
      },
    ]);

    obtenerUbicacionesDeArea.mockResolvedValue([
      {
        subzona: 'Z01',
        stat: 'Inicio',
        ubicacion: 'LIN2-A01-Z01',
      },
    ]);

    InventoryService.cargarUbicacion.mockResolvedValue([]);

    await cargarSecciones();
    await act(async () => {
      presionarPorTexto('Sección LIN2');
    });
    await act(async () => {
      presionarPorTexto('Área A01');
    });

    await act(async () => {
      presionarPorTexto('LIN2-A01-Z01');
    });

    expect(InventoryService.cargarUbicacion)
      .toHaveBeenCalledWith('LIN2-A01-Z01');
  });

});
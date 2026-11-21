import React from 'react';
import { create, act } from 'react-test-renderer';
import { Image, Linking, Text } from 'react-native';

import PlanosModal from '../../src/components/PlanosModal';
import { listarPlanos, urlPlano } from '../../src/services/planosService';

jest.mock('../../src/services/planosService', () => ({
  listarPlanos: jest.fn(),
  urlPlano: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: (props) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.name);
  },
}));

const PDF = { nombre: '148165.pdf', ruta: 'CARP/148165.pdf', tipo: 'pdf', bytes: 108915 };
const PNG = { nombre: 'detalle.png', ruta: 'CARP/A01/detalle.png', tipo: 'imagen', bytes: 21480 };

describe('PlanosModal', () => {

  let renderer;

  const textoDe = (nodo) => {
    const c = nodo.props.children;
    return Array.isArray(c) ? c.join('') : c;
  };

  const existeTexto = (texto) =>
    renderer.root.findAllByType(Text).some((t) => String(textoDe(t)) === texto);

  const existeTestID = (testID) =>
    renderer.root.findAllByProps({ testID }).length > 0;

  const pulsar = async (testID) => {
    await act(async () => {
      renderer.root.findByProps({ testID }).props.onPress();
      await Promise.resolve();
    });
  };

  const montar = async (props = {}) => {
    await act(async () => {
      renderer = create(
        <PlanosModal visible seccion="CARP" onCerrar={jest.fn()} {...props} />
      );
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    listarPlanos.mockImplementation(async (seccion, area) => (area ? [PNG] : [PDF]));
    urlPlano.mockImplementation(async (ruta) => `https://firmada/${ruta}`);
  });

  afterEach(() => {
    Linking.openURL.mockRestore();
    act(() => {
      renderer.unmount();
    });
  });

  test('lista los planos de sección y de área', async () => {
    await montar({ area: 'A01' });

    expect(listarPlanos).toHaveBeenCalledWith('CARP');
    expect(listarPlanos).toHaveBeenCalledWith('CARP', 'A01');
    expect(existeTexto('Sección CARP')).toBe(true);
    expect(existeTexto('Área A01')).toBe(true);
    expect(existeTexto('148165.pdf')).toBe(true);
    expect(existeTexto('detalle.png')).toBe(true);
  });

  test('sin área solo pide la sección', async () => {
    await montar();

    expect(listarPlanos).toHaveBeenCalledTimes(1);
    expect(existeTexto('Área A01')).toBe(false);
  });

  test('un PDF se abre fuera de la app con la URL firmada', async () => {
    await montar();

    await pulsar('plano-CARP/148165.pdf');

    expect(urlPlano).toHaveBeenCalledWith('CARP/148165.pdf');
    expect(Linking.openURL).toHaveBeenCalledWith('https://firmada/CARP/148165.pdf');
  });

  test('una imagen se ve dentro y se puede abrir en el navegador', async () => {
    await montar({ area: 'A01' });

    await pulsar('plano-CARP/A01/detalle.png');

    const imagen = renderer.root.findByType(Image);
    expect(imagen.props.source).toEqual({ uri: 'https://firmada/CARP/A01/detalle.png' });
    expect(Linking.openURL).not.toHaveBeenCalled();

    await pulsar('btn-abrir-navegador');
    expect(Linking.openURL).toHaveBeenCalledWith('https://firmada/CARP/A01/detalle.png');

    await pulsar('btn-volver-planos');
    expect(existeTestID('plano-imagen')).toBe(false);
    expect(existeTexto('148165.pdf')).toBe(true);
  });

  test('sección sin planos lo dice', async () => {
    listarPlanos.mockResolvedValue([]);

    await montar();

    expect(existeTexto('Esta sección no tiene planos.')).toBe(true);
  });

  test('sin conexión muestra el aviso y deja reintentar', async () => {
    listarPlanos.mockRejectedValueOnce(new Error('Necesitas conexión para ver los planos'));

    await montar();

    expect(existeTexto('Necesitas conexión para ver los planos')).toBe(true);
    expect(existeTexto('Esta sección no tiene planos.')).toBe(false);

    await pulsar('btn-reintentar-planos');

    expect(existeTexto('148165.pdf')).toBe(true);
    expect(existeTestID('planos-error')).toBe(false);
  });

  test('un error al abrir el plano se muestra', async () => {
    urlPlano.mockRejectedValueOnce(new Error('Object not found'));

    await montar();
    await pulsar('plano-CARP/148165.pdf');

    expect(existeTexto('Object not found')).toBe(true);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  test('cerrar llama a onCerrar', async () => {
    const onCerrar = jest.fn();
    await montar({ onCerrar });

    await pulsar('btn-cerrar-planos');

    expect(onCerrar).toHaveBeenCalled();
  });

});

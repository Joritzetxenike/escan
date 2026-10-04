import React from 'react';
import { create, act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useHomeLogic } from '../../src/logic/HomeLogic';
import InventoryService from '../../src/services/InventoryService';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../src/services/InventoryService', () => ({
  cargarUbicacion: jest.fn(),
  validarArticulo: jest.fn(),
  validarUbicacion: jest.fn(),
  crearMovimiento: jest.fn(),
  guardarMovimiento: jest.fn(),
  estaUbicacionFinalizada: jest.fn(),
  estaOnline: jest.fn(),
  sincronizarPendientes: jest.fn(),
}));

// Estado de conexión que devuelve el hook
let mockEstadoConexion = { online: true };

jest.mock('../../src/logic/useConectividad', () => ({
  __esModule: true,
  default: () => mockEstadoConexion,
}));

// Harness: ejecuta el hook y expone su resultado en `current`.
let current = null;

function Harness({ navigation }) {
  current = useHomeLogic(navigation);
  return null;
}

describe('useHomeLogic', () => {

  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEstadoConexion = { online: true };

    InventoryService.estaOnline.mockResolvedValue(true);

    act(() => {
      renderer = create(<Harness navigation={navigation} />);
    });
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
    current = null;
  });

  // =====================================================
  // abrirScannerUbicacion / abrirScannerArticulo
  // =====================================================

  describe('abrirScannerUbicacion', () => {

    test('navega al scanner de tipo ubicacion', () => {
      act(() => {
        current.abrirScannerUbicacion();
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'Scanner',
        expect.objectContaining({
          tipo: 'ubicacion',
          onScan: expect.any(Function),
        })
      );
    });

  });

  describe('abrirScannerArticulo', () => {

    test('avisa si aún no hay ubicación y no navega', () => {
      act(() => {
        current.abrirScannerArticulo();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Primero escanea una ubicación'
      );

      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    test('navega al scanner de tipo articulo si hay ubicación', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      act(() => {
        current.abrirScannerArticulo();
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'Scanner',
        expect.objectContaining({
          tipo: 'articulo',
          onScan: expect.any(Function),
        })
      );
    });

  });

  // =====================================================
  // abrirModalManual
  // =====================================================

  describe('abrirModalManual', () => {

    test('avisa si aún no hay ubicación y no abre el modal', async () => {
      await act(async () => {
        await current.abrirModalManual();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Primero escanea una ubicación'
      );

      expect(current.mostrarManual).toBe(false);
    });

    test('abre el modal de código manual si hay ubicación', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.abrirModalManual();
      });

      expect(current.mostrarManual).toBe(true);
    });

    test('sin conexión también deja meter códigos a mano', async () => {
      /* Con la copia local del maestro la validación ya no
         necesita red, así que el bloqueo se levantó */
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      InventoryService.estaOnline.mockResolvedValue(false);

      await act(async () => {
        await current.abrirModalManual();
      });

      expect(current.mostrarManual).toBe(true);

      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Sin conexión',
        expect.anything()
      );
    });

  });

  // =====================================================
  // cargarUbicacion
  // =====================================================

  describe('cargarUbicacion', () => {

    test('guarda la ubicación y devuelve sus artículos si es válida', async () => {
      const articulos = [
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
      ];

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue(articulos);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacion).toBe('A1');
      expect(InventoryService.validarUbicacion)
        .toHaveBeenCalledWith('A1');
      expect(InventoryService.cargarUbicacion)
        .toHaveBeenCalledWith('A1');
    });

    test('no carga la ubicación y avisa si no existe en el maestro', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: false,
        titulo: 'Ubicación no encontrada',
        mensaje: 'El código LIN2-A99-Z99 no existe en el maestro',
      });

      await act(async () => {
        await current.procesarEscaneo(
          'ubicacion',
          'LIN2-A99-Z99'
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación no encontrada',
        'El código LIN2-A99-Z99 no existe en el maestro'
      );

      expect(current.ubicacion).toBeNull();
      expect(InventoryService.cargarUbicacion).not.toHaveBeenCalled();
    });

    test('normaliza el código antes de validar y de guardarlo', async () => {

      /* Al teclearlo es fácil dejar espacios o escribirlo en
         minúsculas, y los códigos del maestro son siempre
         `SECCION-AREA-SUBZONA` en mayúsculas. */

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'LIN2', area: 'A01', subzona: 'Z01' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo(
          'ubicacion',
          '  lin2-a01-z01  '
        );
      });

      expect(InventoryService.validarUbicacion)
        .toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(InventoryService.cargarUbicacion)
        .toHaveBeenCalledWith('LIN2-A01-Z01');

      /* Lo que se muestra y se guarda también va normalizado */
      expect(current.ubicacion).toBe('LIN2-A01-Z01');
    });

    test('no deja dos formas del mismo código en el estado', async () => {

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'LIN2', area: 'A01', subzona: 'Z01' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo(
          'ubicacion',
          'LIN2-A01-Z01'
        );
      });

      await act(async () => {
        await current.procesarEscaneo(
          'ubicacion',
          'lin2-a01-z01'
        );
      });

      expect(current.ubicacion).toBe('LIN2-A01-Z01');
    });

  });


  // =====================================================
  // Entrada manual de ubicación
  // =====================================================

  describe('onManualUbicacion', () => {

    beforeEach(() => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'LIN2', area: 'A01', subzona: 'Z01' },
      });

      InventoryService.cargarUbicacion.mockResolvedValue([]);
    });

    test('abre el modal sin exigir ubicación previa', async () => {

      expect(current.ubicacion).toBeNull();

      await act(async () => {
        await current.abrirModalManualUbicacion();
      });

      expect(current.mostrarManualUbicacion).toBe(true);
    });

    test('acepta el código tecleado y devuelve true', async () => {

      await act(async () => {
        await current.abrirModalManualUbicacion();
      });

      let valida;

      await act(async () => {
        valida = await current.onManualUbicacion(
          'LIN2-A01-Z01'
        );
      });

      expect(valida).toBe(true);
      expect(current.ubicacion).toBe('LIN2-A01-Z01');
    });

    test('normaliza el código tecleado', async () => {

      await act(async () => {
        await current.onManualUbicacion(
          ' lin2-a01-z01 '
        );
      });

      expect(InventoryService.validarUbicacion)
        .toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(current.ubicacion).toBe('LIN2-A01-Z01');
    });

    test('devuelve false y avisa si el código no existe', async () => {

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: false,
        titulo: 'Ubicación no encontrada',
        mensaje: 'El código LIN2-A99-Z99 no está en la copia local del maestro',
      });

      let valida;

      await act(async () => {
        valida = await current.onManualUbicacion(
          'LIN2-A99-Z99'
        );
      });

      /* `false` es lo que mantiene el modal abierto */
      expect(valida).toBe(false);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación no encontrada',
        expect.stringContaining('LIN2-A99-Z99')
      );

      expect(current.ubicacion).toBeNull();
    });

    test('no toca la ubicación anterior si la nueva es inválida', async () => {

      await act(async () => {
        await current.onManualUbicacion(
          'LIN2-A01-Z01'
        );
      });

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: false,
        titulo: 'Ubicación no encontrada',
        mensaje: 'no está en la copia local del maestro',
      });

      await act(async () => {
        await current.onManualUbicacion(
          'LIN2-A99-Z99'
        );
      });

      /* La que estaba sigue puesta */
      expect(current.ubicacion).toBe('LIN2-A01-Z01');
    });

    test('funciona sin conexión', async () => {

      InventoryService.estaOnline.mockResolvedValue(false);

      await act(async () => {
        await current.abrirModalManualUbicacion();
      });

      expect(current.mostrarManualUbicacion).toBe(true);
    });

  });

  // =====================================================
  // ubicacionFinalizada
  // =====================================================

  describe('ubicacionFinalizada', () => {

    test('marca la ubicación como no finalizada si está en Inicio', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Inicio' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacionFinalizada).toBe(false);
    });

    test('marca la ubicación como finalizada si escanea una en estado Fin', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Fin' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      expect(current.ubicacionFinalizada).toBe(true);
    });

    test('bloquea artículos si la ubicación escaneada ya está terminada', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Fin' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación terminada',
        expect.stringContaining('A1')
      );

      expect(InventoryService.validarArticulo).not.toHaveBeenCalled();
      expect(current.articuloTemp).toBeNull();
    });

    test('revalida al volver a Home y bloquea si la ubicación pasó a Fin', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1', stat: 'Inicio' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });
      InventoryService.estaUbicacionFinalizada.mockResolvedValue(true);

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });
      expect(current.ubicacionFinalizada).toBe(false);

      const alEnfocar = useFocusEffect.mock.calls.at(-1)[0];
      await act(async () => {
        await alEnfocar();
      });

      expect(InventoryService.estaUbicacionFinalizada)
        .toHaveBeenCalledWith('A1');
      expect(current.ubicacionFinalizada).toBe(true);

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación terminada',
        expect.stringContaining('A1')
      );

      expect(InventoryService.validarArticulo).not.toHaveBeenCalled();
    });

  });

  // =====================================================
  // procesarArticulo (via procesarEscaneo / onManualCode)
  // =====================================================

  describe('procesarArticulo', () => {

    test('muestra alerta si el artículo no es válido', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: false,
        titulo: 'Artículo no encontrado',
        mensaje: 'El código 999999 no existe en el maestro',
      });

      await act(async () => {
        await current.onManualCode('999999');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Artículo no encontrado',
        'El código 999999 no existe en el maestro'
      );

      expect(current.articuloTemp).toBeNull();
    });

    test('avisa cuando el artículo es SIC', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: true,
        articulo: { item: '123456', tipo: 'SIC' },
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Artículo SIC',
        expect.stringContaining('123456')
      );

      expect(current.articuloTemp).toBe('123456');
    });

    test('acepta un artículo válido y pide la cantidad', async () => {
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(current.articuloTemp).toBe('123456');
      expect(current.mostrarCantidad).toBe(true);
    });

  });

  // =====================================================
  // confirmarCantidad
  // =====================================================

  describe('confirmarCantidad', () => {

    test('guarda el movimiento, actualiza últimos y limpia', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });
      InventoryService.crearMovimiento.mockImplementation(
        (ubicacion, articulo, cantidad) => ({
          ubicacion,
          articulo,
          cantidad,
        })
      );
      InventoryService.guardarMovimiento.mockResolvedValue({
        pendiente: false,
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.procesarEscaneo('articulo', '123456');
      });

      await act(async () => {
        await current.confirmarCantidad(5);
      });

      expect(InventoryService.guardarMovimiento)
        .toHaveBeenCalledWith(
          {
            ubicacion: 'A1',
            articulo: '123456',
            cantidad: 5,
          },
          {
            provisionalArticulo: false,
            ubicacionProvisional: false,
          }
        );

      expect(current.ultimosArticulos).toEqual([
        {
          ubicacion: 'A1',
          articulo: '123456',
          cantidad: 5,
          pendiente: false,
        },
      ]);

      expect(current.articuloTemp).toBeNull();
      expect(current.mostrarCantidad).toBe(false);
    });

    test('marca el artículo como pendiente si no se pudo sincronizar', async () => {
      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        provisional: true,
        articulo: null,
      });
      InventoryService.crearMovimiento.mockImplementation(
        (ubicacion, articulo, cantidad) => ({
          ubicacion,
          articulo,
          cantidad,
        })
      );
      InventoryService.guardarMovimiento.mockResolvedValue({
        pendiente: true,
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.procesarEscaneo('articulo', '123456');
      });

      expect(current.articuloSinValidar).toBe(true);

      await act(async () => {
        await current.confirmarCantidad(2);
      });

      expect(InventoryService.guardarMovimiento)
        .toHaveBeenCalledWith(
          expect.anything(),
          {
            provisionalArticulo: true,
            ubicacionProvisional: false,
          }
        );

      expect(current.ultimosArticulos).toEqual([
        {
          ubicacion: 'A1',
          articulo: '123456',
          cantidad: 2,
          pendiente: true,
        },
      ]);
    });

  });


  // =====================================================
  // descartarArticulo
  // =====================================================

  describe('descartarArticulo', () => {

    const prepararArticulo = async () => {

      InventoryService.validarUbicacion.mockResolvedValue({
        ok: true,
        ubicacion: { seccion: 'A', area: '1', subzona: '1' },
      });
      InventoryService.cargarUbicacion.mockResolvedValue([]);
      InventoryService.validarArticulo.mockResolvedValue({
        ok: true,
        esSIC: false,
        articulo: { item: '123456', tipo: 'Normal' },
      });

      await act(async () => {
        await current.procesarEscaneo('ubicacion', 'A1');
      });

      await act(async () => {
        await current.procesarEscaneo('articulo', '123456');
      });

    };

    test('cierra el modal y limpia el artículo pendiente', async () => {

      await prepararArticulo();

      expect(current.mostrarCantidad).toBe(true);
      expect(current.articuloTemp).toBe('123456');

      await act(async () => {
        current.descartarArticulo();
      });

      expect(current.mostrarCantidad).toBe(false);
      expect(current.articuloTemp).toBeNull();

    });

    test('libera la reserva y permite volver a escanear el mismo código', async () => {

      await prepararArticulo();

      await act(async () => {
        current.descartarArticulo();
      });

      await act(async () => {
        await current.onManualCode('123456');
      });

      expect(current.articuloTemp).toBe('123456');
      expect(current.mostrarCantidad).toBe(true);

      /* El segundo escaneo ya no arrastra el código como
         duplicado: `validarDuplicado` no lo encuentra. */

      const escaneos =
        InventoryService.validarArticulo.mock.calls;

      expect(escaneos[escaneos.length - 1][2])
        .toEqual([]);

    });

    test('conserva la reserva cuando el movimiento sí se guarda', async () => {

      InventoryService.crearMovimiento
        .mockImplementation(
          (ubicacion, articulo, cantidad) => ({
            ubicacion,
            articulo,
            cantidad,
          })
        );
      InventoryService.guardarMovimiento
        .mockResolvedValue({ pendiente: false });

      await prepararArticulo();

      await act(async () => {
        await current.confirmarCantidad(5);
      });

      /* El artículo guardado sigue marcado como contado
         para que un nuevo escaneo del mismo código avise
         de duplicado. */

      await act(async () => {
        await current.onManualCode('123456');
      });

      const escaneos =
        InventoryService.validarArticulo.mock.calls;

      expect(escaneos[escaneos.length - 1][2])
        .toEqual(['123456']);

    });

  });

});

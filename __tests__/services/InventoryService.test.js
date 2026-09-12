import InventoryService from '../../src/services/InventoryService';
import DataProvider from '../../src/providers/DataProvider';
import * as FileSystem from 'expo-file-system/legacy';

// Mockeamos el proveedor para NO tocar archivos CSV
// ni ninguna base de datos durante los tests.
jest.mock('../../src/providers/DataProvider', () => ({
  obtenerArticulosUbicacion: jest.fn(),
  guardarMovimiento: jest.fn(),
  obtenerArticulo: jest.fn(),
  obtenerUbicacion: jest.fn(),
  eliminarMovimiento: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

describe('InventoryService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // =====================================================
  // cargarUbicacion
  // =====================================================

  describe('cargarUbicacion', () => {

    test('debe obtener los artículos de una ubicación', async () => {

      const articulos = [
        {
          ubicacion: 'A1',
          articulo: '123456',
          cantidad: 5,
        },
      ];

      DataProvider.obtenerArticulosUbicacion.mockResolvedValue(articulos);

      const resultado =
        await InventoryService.cargarUbicacion('A1');

      expect(
        DataProvider.obtenerArticulosUbicacion
      ).toHaveBeenCalledWith('A1');

      expect(resultado).toEqual(articulos);
    });

  });


  // =====================================================
  // guardarMovimiento
  // =====================================================

  describe('guardarMovimiento', () => {

    test('debe guardar el movimiento usando el DataProvider', async () => {

      const movimiento = {
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 10,
      };

      DataProvider.guardarMovimiento.mockResolvedValue(true);

      const resultado =
        await InventoryService.guardarMovimiento(movimiento);

      expect(
        DataProvider.guardarMovimiento
      ).toHaveBeenCalledWith(movimiento);

      expect(resultado).toBe(true);
    });

  });


  // =====================================================
  // validarArticulo
  // =====================================================

  describe('validarArticulo', () => {

    test('debe rechazar un artículo si no hay ubicación', async () => {
      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          null,
          []
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
      expect(resultado.mensaje).toBe(
        'Primero escanea una ubicación'
      );

      expect(DataProvider.obtenerArticulo).not.toHaveBeenCalled();
    });

    test('debe rechazar un artículo duplicado', async () => {
      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          ['123456']
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Artículo duplicado');
      expect(resultado.mensaje).toBe(
        'El artículo 123456 ya ha sido escaneado en la ubicación A1'
      );

      expect(DataProvider.obtenerArticulo).not.toHaveBeenCalled();
    });

    test('debe rechazar un artículo que no existe en el maestro', async () => {
      DataProvider.obtenerArticulo.mockResolvedValue(null);

      const resultado =
        await InventoryService.validarArticulo(
          '999999',
          'A1',
          []
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Artículo no encontrado');
      expect(resultado.mensaje).toBe(
        'El código 999999 no existe en el maestro'
      );
    });

    test('debe aceptar un artículo válido', async () => {
      const articuloMaestro = {
        item: '123456',
        dsca: 'Producto de prueba',
        tipo: 'Normal',
      };

      DataProvider.obtenerArticulo.mockResolvedValue(articuloMaestro);

      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          []
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(false);
      expect(resultado.articulo).toEqual(articuloMaestro);
    });

    test('debe marcar esSIC si el artículo es SIC', async () => {
      DataProvider.obtenerArticulo.mockResolvedValue({
        item: '123456',
        dsca: 'Producto SIC',
        tipo: 'SIC',
      });

      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          []
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(true);
    });

  });


  // =====================================================
  // validarUbicacion
  // =====================================================

  describe('validarUbicacion', () => {

    test('debe rechazar un código de ubicación vacío', async () => {
      const resultado =
        await InventoryService.validarUbicacion('');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
      expect(resultado.mensaje).toBe(
        'El código de ubicación es inválido'
      );

      expect(DataProvider.obtenerUbicacion).not.toHaveBeenCalled();
    });

    test('debe rechazar una ubicación que no existe en el maestro', async () => {
      DataProvider.obtenerUbicacion.mockResolvedValue(null);

      const resultado =
        await InventoryService.validarUbicacion('99999-999-Z999');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Ubicación no encontrada');
      expect(resultado.mensaje).toBe(
        'El código 99999-999-Z999 no existe en el maestro'
      );
    });

    test('debe aceptar una ubicación válida', async () => {
      const ubicacionMaestro = {
        seccion: '50100',
        area: '111',
        subzona: 'Z101',
        stat: 'Inicio',
      };

      DataProvider.obtenerUbicacion.mockResolvedValue(ubicacionMaestro);

      const resultado =
        await InventoryService.validarUbicacion('50100-111-Z101');

      expect(resultado.ok).toBe(true);
      expect(resultado.ubicacion).toEqual(ubicacionMaestro);
    });

    test('debe propagar el error si falla la consulta al maestro', async () => {
      DataProvider.obtenerUbicacion.mockRejectedValue(
        new Error('Error de red')
      );

      await expect(
        InventoryService.validarUbicacion('50100-111-Z101')
      ).rejects.toThrow('Error de red');
    });

  });


  // =====================================================
  // eliminarMovimiento
  // =====================================================

  describe('eliminarMovimiento', () => {

    test('debe eliminar en la BD y en el CSV', async () => {

      DataProvider.eliminarMovimiento.mockResolvedValue(true);

      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      FileSystem.readAsStringAsync.mockResolvedValue(
        'A1,123456,5\nA1,999999,10'
      );

      FileSystem.writeAsStringAsync.mockResolvedValue();

      const resultado =
        await InventoryService.eliminarMovimiento(
          'A1',
          '123456'
        );

      expect(
        DataProvider.eliminarMovimiento
      ).toHaveBeenCalledWith('A1', '123456');

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,999999,10'
      );

      expect(resultado).toBe(true);
    });

  });


  // =====================================================
  // crearMovimiento
  // =====================================================

  describe('crearMovimiento', () => {

    test('debe crear correctamente un movimiento', () => {

      const resultado =
        InventoryService.crearMovimiento(
          'A1',
          '123456',
          10
        );

      expect(resultado).toEqual({
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 10,
      });
    });

  });

});


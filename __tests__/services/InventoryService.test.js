import InventoryService from '../../src/services/InventoryService';
import DataProvider from '../../src/providers/DataProvider';

// Mockeamos el proveedor para NO tocar archivos CSV
// ni ninguna base de datos durante los tests.
jest.mock('../../src/providers/DataProvider', () => ({
  obtenerArticulosUbicacion: jest.fn(),
  guardarMovimiento: jest.fn(),
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

  // TODO: actualizar mocks y convertir a async
  // describe('validarArticulo', () => {
  //   test('debe rechazar un artículo si no hay ubicación', async () => {
  //     const resultado = await InventoryService.validarArticulo('123456', null, []);
  //     expect(resultado.ok).toBe(false);
  //     expect(resultado.titulo).toBe('Error');
  //     expect(resultado.mensaje).toBe('Primero escanea una ubicación');
  //   });
  //   test('debe rechazar un artículo duplicado', async () => {
  //     const resultado = await InventoryService.validarArticulo('123456', 'A1', ['123456']);
  //     expect(resultado.ok).toBe(false);
  //     expect(resultado.titulo).toBe('Artículo duplicado');
  //     expect(resultado.mensaje).toBe('El artículo 123456 ya ha sido escaneado en la ubicación A1');
  //   });
  //   test('debe aceptar un artículo válido', async () => {
  //     const resultado = await InventoryService.validarArticulo('123456', 'A1', []);
  //     expect(resultado).toEqual({ ok: true, articulo: {...}, esSIC: false });
  //   });
  //   test('debe aceptar un artículo diferente a los ya escaneados', async () => {
  //     const resultado = await InventoryService.validarArticulo('999999', 'A1', ['123456', '555555']);
  //     expect(resultado).toEqual({ ok: true, articulo: {...}, esSIC: false });
  //   });
  // });


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


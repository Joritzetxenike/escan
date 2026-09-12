import ArticuloValidator from '../../src/validators/ArticuloValidator';
import DataProvider from '../../src/providers/DataProvider';

jest.mock('../../src/providers/DataProvider', () => ({
  obtenerArticulo: jest.fn(),
}));

describe('ArticuloValidator', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // validarUbicacionPrevia
  // =====================================================

  describe('validarUbicacionPrevia', () => {

    test('pasa si hay una ubicación', () => {
      expect(
        ArticuloValidator.validarUbicacionPrevia('A1')
      ).toBeNull();
    });

    test('rechaza si no hay ubicación', () => {
      expect(
        ArticuloValidator.validarUbicacionPrevia(null)
      ).toEqual({
        ok: false,
        titulo: 'Error',
        mensaje: 'Primero escanea una ubicación',
      });
    });

  });

  // =====================================================
  // validarDuplicado
  // =====================================================

  describe('validarDuplicado', () => {

    test('pasa si el artículo no está escaneado en la sesión', () => {
      expect(
        ArticuloValidator.validarDuplicado('123456', ['999999'], 'A1')
      ).toBeNull();
    });

    test('rechaza un artículo duplicado', () => {
      expect(
        ArticuloValidator.validarDuplicado('123456', ['123456'], 'A1')
      ).toEqual({
        ok: false,
        titulo: 'Artículo duplicado',
        mensaje:
          'El artículo 123456 ya ha sido escaneado en la ubicación A1',
      });
    });

  });

  // =====================================================
  // validarExistencia
  // =====================================================

  describe('validarExistencia', () => {

    test('devuelve el artículo del maestro', async () => {
      const articulo = {
        item: '123456',
        dsca: 'Producto de prueba',
        tipo: 'Normal',
      };

      DataProvider.obtenerArticulo.mockResolvedValue(articulo);

      const resultado =
        await ArticuloValidator.validarExistencia('123456');

      expect(DataProvider.obtenerArticulo)
        .toHaveBeenCalledWith('123456');
      expect(resultado).toEqual(articulo);
    });

  });

  // =====================================================
  // validar
  // =====================================================

  describe('validar', () => {

    test('debe rechazar un artículo si no hay ubicación', async () => {
      const resultado =
        await ArticuloValidator.validar('123456', null, []);

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
      expect(resultado.mensaje).toBe(
        'Primero escanea una ubicación'
      );

      expect(DataProvider.obtenerArticulo).not.toHaveBeenCalled();
    });

    test('debe rechazar un artículo duplicado', async () => {
      const resultado =
        await ArticuloValidator.validar('123456', 'A1', ['123456']);

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
        await ArticuloValidator.validar('999999', 'A1', []);

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
        await ArticuloValidator.validar('123456', 'A1', []);

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
        await ArticuloValidator.validar('123456', 'A1', []);

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(true);
    });

  });

});
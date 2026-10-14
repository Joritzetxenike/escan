import ArticuloValidator from '../../src/validators/ArticuloValidator';
import maestrosService from '../../src/services/maestrosService';

/* =======================================================
 * VALIDACIÓN DE ARTÍCULOS CONTRA LA COPIA LOCAL
 *
 * Ya no se consulta Supabase: todo sale del maestro local.
 * ======================================================= */

jest.mock('../../src/services/maestrosService', () => ({
  DIAS_PELIGROSO: 7,
  SIN_CONEXION: 'Sin conexión',
  asegurarListo: jest.fn(),
  existeArticulo: jest.fn(),
  esSIC: jest.fn(),
  esGenerico: jest.fn(),
  obtenerEstado: jest.fn(() => ({ error: null })),
}));

describe('ArticuloValidator', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    maestrosService.asegurarListo.mockResolvedValue(true);
    maestrosService.existeArticulo.mockReturnValue(true);
    maestrosService.esSIC.mockReturnValue(false);
    maestrosService.esGenerico.mockReturnValue(false);
    maestrosService.obtenerEstado.mockReturnValue({
      error: null,
    });
  });


  // =====================================================
  // REGLAS BÁSICAS (sin tocar la copia)
  // =====================================================

  describe('validarUbicacionPrevia', () => {

    test('exige una ubicación antes que nada', () => {
      expect(
        ArticuloValidator.validarUbicacionPrevia('A1')
      ).toBeNull();

      expect(
        ArticuloValidator.validarUbicacionPrevia(null)
          .mensaje
      ).toBe('Primero escanea una ubicación');
    });

  });

  // =====================================================
  // CONSULTA A LA COPIA LOCAL
  // =====================================================

  describe('validar', () => {

    test('rechaza si no hay ubicación, sin tocar la copia', async () => {

      const resultado =
        await ArticuloValidator.validar(
          '123456',
          null
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');

      expect(
        maestrosService.asegurarListo
      ).not.toHaveBeenCalled();
    });

    test('acepta un artículo que está en la copia', async () => {

      const resultado =
        await ArticuloValidator.validar(
          '123456',
          'A1'
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.provisional).toBe(false);
      expect(resultado.esSIC).toBe(false);

      expect(
        maestrosService.existeArticulo
      ).toHaveBeenCalledWith('123456');
    });

    test('marca esSIC si el artículo lo es', async () => {
      maestrosService.esSIC.mockReturnValue(true);

      const resultado =
        await ArticuloValidator.validar(
          '123456',
          'A1'
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(true);
    });

    test('rechaza un artículo genérico indicando el motivo', async () => {
      maestrosService.esGenerico.mockReturnValue(true);

      const resultado =
        await ArticuloValidator.validar(
          '123456',
          'A1'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Artículo genérico');
      expect(resultado.mensaje).toContain('genérico');
    });

    test('rechaza un artículo que NO está en la copia', async () => {
      maestrosService.existeArticulo.mockReturnValue(false);

      const resultado =
        await ArticuloValidator.validar(
          '999999',
          'A1'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Artículo no encontrado');
      expect(resultado.mensaje).toContain(
        'no existe en el maestro'
      );
    });

    test('el rechazo sugiere actualizar la copia', async () => {
      maestrosService.existeArticulo.mockReturnValue(false);

      const resultado =
        await ArticuloValidator.validar(
          '999999',
          'A1'
        );

      expect(resultado.mensaje).toContain(
        'actualiza la copia del maestro'
      );
    });

    test('rechaza si no hay copia, e indica el motivo', async () => {
      maestrosService.asegurarListo.mockResolvedValue(false);

      maestrosService.obtenerEstado.mockReturnValue({
        error: 'No se pudo leer el JSON',
      });

      const resultado =
        await ArticuloValidator.validar(
          '123456',
          'A1'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Sin copia de maestros');
      expect(resultado.mensaje).toContain(
        'Conéctate una vez para descargarla'
      );
      expect(resultado.mensaje).toContain(
        'No se pudo leer el JSON'
      );
    });

    test('no acepta artículos provisionales', async () => {
      const resultado =
        await ArticuloValidator.validar(
          '123456',
          'A1'
        );

      expect(resultado.provisional).toBe(false);
    });

  });

});
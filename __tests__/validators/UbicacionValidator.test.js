import UbicacionValidator from '../../src/validators/UbicacionValidator';
import maestrosService from '../../src/services/maestrosService';

/* =======================================================
 * VALIDACIÓN DE UBICACIONES CONTRA LA COPIA LOCAL
 * ======================================================= */

jest.mock('../../src/services/maestrosService', () => ({
  DIAS_PELIGROSO: 7,
  SIN_CONEXION: 'Sin conexión',
  asegurarListo: jest.fn(),
  existeUbicacion: jest.fn(),
  obtenerEstado: jest.fn(() => ({ error: null })),
}));

describe('UbicacionValidator', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    maestrosService.asegurarListo.mockResolvedValue(true);
    maestrosService.existeUbicacion.mockReturnValue(true);
    maestrosService.obtenerEstado.mockReturnValue({
      error: null,
    });
  });


  // =====================================================
  // FORMATO (no necesita la copia)
  // =====================================================

  describe('validarFormato', () => {

    test('acepta seccion-area-subzona', () => {
      expect(
        UbicacionValidator.validarFormato(
          'LIN2-A01-Z01'
        )
      ).toBe(true);
    });

    test('rechaza formatos incompletos o sobrantes', () => {
      expect(
        UbicacionValidator.validarFormato('LIN2')
      ).toBe(false);

      expect(
        UbicacionValidator.validarFormato('LIN2-A01')
      ).toBe(false);

      expect(
        UbicacionValidator.validarFormato(
          'LIN2-A01-Z01-X'
        )
      ).toBe(false);

      expect(
        UbicacionValidator.validarFormato('LIN2-A01-')
      ).toBe(false);
    });

    test('rechaza vacío y null', () => {
      expect(
        UbicacionValidator.validarFormato('')
      ).toBe(false);

      expect(
        UbicacionValidator.validarFormato(null)
      ).toBe(false);
    });

  });


  // =====================================================
  // CONSULTA A LA COPIA LOCAL
  // =====================================================

  describe('validar', () => {

    test('rechaza un código vacío', async () => {

      const resultado =
        await UbicacionValidator.validar('');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
      expect(resultado.mensaje).toBe(
        'El código de ubicación es inválido'
      );
    });

    test('rechaza un formato inválido sin tocar la copia', async () => {

      const resultado =
        await UbicacionValidator.validar('LIN2');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Ubicación inválida');

      expect(
        maestrosService.asegurarListo
      ).not.toHaveBeenCalled();
    });

    test('acepta una ubicación que está en la copia', async () => {

      const resultado =
        await UbicacionValidator.validar(
          'LIN2-A01-Z01'
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.ubicacion).toEqual({
        ubicacion: 'LIN2-A01-Z01',
        stat: null,
      });
      expect(resultado.ubicacionProvisional).toBe(false);
    });

    test('rechaza una ubicación que NO está en la copia', async () => {
      maestrosService.existeUbicacion.mockReturnValue(false);

      const resultado =
        await UbicacionValidator.validar(
          'LIN2-A99-Z99'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe(
        'Ubicación no encontrada'
      );
      expect(resultado.mensaje).toContain(
        'no está en la copia local del maestro'
      );
    });

    test('si falta la copia de ubicaciones, rechaza', async () => {
      /* Sin copia de ubicaciones no hay forma de saber si el
         código existe: se rechaza, igual que sin copia de
         artículos. Antes se aceptaba por formato, lo que
         dejaba pasar ubicaciones inventadas al teclear. */
      maestrosService.existeUbicacion.mockReturnValue(null);

      const resultado =
        await UbicacionValidator.validar(
          'LIN2-A01-Z01'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe(
        'Sin copia de ubicaciones'
      );
      expect(resultado.mensaje).toContain(
        'falta la copia de ubicaciones'
      );
      expect(resultado.ubicacionProvisional)
        .toBeUndefined();
    });

    test('indica el motivo si la copia de ubicaciones falla', async () => {

      maestrosService.existeUbicacion.mockReturnValue(null);

      maestrosService.obtenerEstado.mockReturnValue({
        error: 'Network request failed',
      });

      const resultado =
        await UbicacionValidator.validar(
          'LIN2-A01-Z01'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.mensaje).toContain(
        'Network request failed'
      );
    });

    test('rechaza si no hay copia, e indica el motivo', async () => {
      maestrosService.asegurarListo.mockResolvedValue(false);

      maestrosService.obtenerEstado.mockReturnValue({
        error: 'Network request failed',
      });

      const resultado =
        await UbicacionValidator.validar(
          'LIN2-A01-Z01'
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Sin copia de maestros');
      expect(resultado.mensaje).toContain(
        'Network request failed'
      );
    });


  });


  // =====================================================
  // NORMALIZACIÓN
  // =====================================================
  //
  // Al teclear el código es fácil equivocarse de
  // capitalización o dejar espacios. Los códigos del maestro
  // son siempre `SECCION-AREA-SUBZONA` en mayúsculas.

  describe('normalización', () => {

    test('pasa a mayúsculas y quita espacios', async () => {

      const resultado =
        await UbicacionValidator.validar(
          '  lin2-a01-z01  '
        );

      expect(resultado.ok).toBe(true);

      /* La copia contiene el código en mayúsculas */
      expect(
        maestrosService.existeUbicacion
      ).toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(resultado.ubicacion.ubicacion).toBe(
        'LIN2-A01-Z01'
      );
    });

    test('un código en minúsculas se busca en mayúsculas', async () => {

      await UbicacionValidator.validar(
        'lin2-a01-z01'
      );

      expect(
        maestrosService.existeUbicacion
      ).toHaveBeenCalledWith('LIN2-A01-Z01');
    });

    test('el error de formato enseña el formato esperado', async () => {

      const resultado =
        await UbicacionValidator.validar('lin2');

      expect(resultado.ok).toBe(false);
      expect(resultado.mensaje).toContain('LIN2-A01-Z01');
    });

    test('normaliza también un código vacío con espacios', async () => {

      const resultado =
        await UbicacionValidator.validar('   ');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
    });

  });

});
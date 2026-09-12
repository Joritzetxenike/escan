import UbicacionValidator from '../../src/validators/UbicacionValidator';
import DataProvider from '../../src/providers/DataProvider';

jest.mock('../../src/providers/DataProvider', () => ({
  obtenerUbicacion: jest.fn(),
}));

describe('UbicacionValidator', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // validarFormato
  // =====================================================

  describe('validarFormato', () => {

    test('acepta un código seccion-area-subzona', () => {
      expect(
        UbicacionValidator.validarFormato('50100-111-Z101')
      ).toBe(true);
    });

    test('rechaza un código sin el formato completo', () => {
      expect(
        UbicacionValidator.validarFormato('50100')
      ).toBe(false);
    });

    test('rechaza un código con solo seccion-area', () => {
      expect(
        UbicacionValidator.validarFormato('50100-111')
      ).toBe(false);
    });

    test('rechaza un código con más de tres partes', () => {
      expect(
        UbicacionValidator.validarFormato('50100-111-Z101-X')
      ).toBe(false);
    });

    test('rechaza un código con alguna parte vacía', () => {
      expect(
        UbicacionValidator.validarFormato('50100-111-')
      ).toBe(false);
    });

    test('rechaza un código vacío', () => {
      expect(
        UbicacionValidator.validarFormato('')
      ).toBe(false);
    });

    test('rechaza un código null', () => {
      expect(
        UbicacionValidator.validarFormato(null)
      ).toBe(false);
    });

  });

  // =====================================================
  // validarExistencia
  // =====================================================

  describe('validarExistencia', () => {

    test('devuelve la ubicación del maestro', async () => {
      const ubicacion = {
        seccion: '50100',
        area: '111',
        subzona: 'Z101',
        stat: 'Inicio',
      };

      DataProvider.obtenerUbicacion.mockResolvedValue(ubicacion);

      const resultado =
        await UbicacionValidator.validarExistencia('50100-111-Z101');

      expect(DataProvider.obtenerUbicacion)
        .toHaveBeenCalledWith('50100-111-Z101');
      expect(resultado).toEqual(ubicacion);
    });

  });

  // =====================================================
  // validar
  // =====================================================

  describe('validar', () => {

    test('debe rechazar un código de ubicación vacío', async () => {
      const resultado = await UbicacionValidator.validar('');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Error');
      expect(resultado.mensaje).toBe(
        'El código de ubicación es inválido'
      );

      expect(DataProvider.obtenerUbicacion).not.toHaveBeenCalled();
    });

    test('debe rechazar un código que no sigue el formato', async () => {
      const resultado =
        await UbicacionValidator.validar('50100');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Ubicación inválida');
      expect(resultado.mensaje).toBe(
        'El código 50100 no sigue el formato seccion-area-subzona (ej. 50100-111-Z101)'
      );

      expect(DataProvider.obtenerUbicacion).not.toHaveBeenCalled();
    });

    test('debe rechazar una ubicación que no existe en el maestro', async () => {
      DataProvider.obtenerUbicacion.mockResolvedValue(null);

      const resultado =
        await UbicacionValidator.validar('99999-999-Z999');

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
        await UbicacionValidator.validar('50100-111-Z101');

      expect(resultado.ok).toBe(true);
      expect(resultado.ubicacion).toEqual(ubicacionMaestro);
    });

  });

});
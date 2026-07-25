import ScannerService from '../../src/services/ScannerService';

describe('ScannerService', () => {

  describe('esCodigoValido', () => {

    test('acepta un código válido', () => {
      expect(
        ScannerService.esCodigoValido('123456')
      ).toBe(true);
    });

    test('rechaza un código vacío', () => {
      expect(
        ScannerService.esCodigoValido('')
      ).toBe(false);
    });

    test('rechaza un código null', () => {
      expect(
        ScannerService.esCodigoValido(null)
      ).toBe(false);
    });

    test('rechaza códigos de menos de 6 caracteres', () => {
      expect(
        ScannerService.esCodigoValido('12345')
      ).toBe(false);
    });

  });


  describe('actualizarBuffer', () => {

    test('el primer escaneo no valida el código', () => {

      const buffer = {
        value: '',
        count: 0,
        lastTime: 0,
      };

      const resultado =
        ScannerService.actualizarBuffer(
          buffer,
          '123456'
        );

      expect(resultado.validado).toBe(false);

      expect(resultado.buffer.value).toBe('123456');

      expect(resultado.buffer.count).toBe(1);

    });


    test('el mismo código incrementa el contador', () => {

      const buffer = {
        value: '123456',
        count: 1,
        lastTime: Date.now(),
      };

      const resultado =
        ScannerService.actualizarBuffer(
          buffer,
          '123456'
        );

      expect(resultado.validado).toBe(false);

      expect(resultado.buffer.value).toBe('123456');

      expect(resultado.buffer.count).toBe(2);

    });


    test('un código diferente reinicia el buffer', () => {

      const buffer = {
        value: '123456',
        count: 5,
        lastTime: Date.now(),
      };

      const resultado =
        ScannerService.actualizarBuffer(
          buffer,
          '999999'
        );

      expect(resultado.validado).toBe(false);

      expect(resultado.buffer.value).toBe('999999');

      expect(resultado.buffer.count).toBe(1);

    });


    test('valida el código después de 10 lecturas', () => {

      const buffer = {
        value: '123456',
        count: 9,
        lastTime: Date.now(),
      };

      const resultado =
        ScannerService.actualizarBuffer(
          buffer,
          '123456'
        );

      expect(resultado.validado).toBe(true);

      expect(resultado.buffer.value).toBe('');

      expect(resultado.buffer.count).toBe(0);

    });

  });


  describe('resetBufferIfStale', () => {

    test('mantiene el buffer si no ha expirado', () => {

      const buffer = {
        value: '123456',
        count: 5,
        lastTime: Date.now(),
      };

      const resultado =
        ScannerService.resetBufferIfStale(buffer);

      expect(resultado).toEqual(buffer);

    });


    test('reinicia el buffer si ha expirado', () => {

      const buffer = {
        value: '123456',
        count: 5,
        lastTime: Date.now() - 2000,
      };

      const resultado =
        ScannerService.resetBufferIfStale(buffer);

      expect(resultado).toEqual({
        value: '',
        count: 0,
        lastTime: 0,
      });

    });

  });

});
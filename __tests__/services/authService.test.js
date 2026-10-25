import authService from '../../src/services/authService';

describe('authService', () => {

  afterEach(() => {
    authService.cerrarSesion();
  });

  test('normaliza la matrícula a solo dígitos', () => {
    expect(authService.normalizarMatricula(' 00-12 34 '))
      .toBe('001234');
  });

  test('respeta el máximo de longitud', () => {
    const larga = '1'.repeat(30);

    expect(authService.normalizarMatricula(larga))
      .toHaveLength(authService.MAX_LONGITUD);
  });

  test('rechaza una matrícula vacía', async () => {
    const resultado = await authService.validarMatricula('  ');

    expect(resultado.valida).toBe(false);
    expect(resultado.matricula).toBeNull();
    expect(resultado.error).toBeTruthy();
  });

  test('acepta cualquier número no vacío', async () => {
    const resultado = await authService.validarMatricula('00123');

    expect(resultado).toEqual({
      valida: true,
      matricula: '00123',
      error: null,
    });
  });

  test('guarda y cierra la sesión en memoria', () => {
    expect(authService.haySesion()).toBe(false);

    const sesion = authService.iniciarSesion('0042');

    expect(sesion.matricula).toBe('0042');
    expect(authService.haySesion()).toBe(true);
    expect(authService.obtenerMatricula()).toBe('0042');

    authService.cerrarSesion();

    expect(authService.haySesion()).toBe(false);
    expect(authService.obtenerMatricula()).toBeNull();
  });

});

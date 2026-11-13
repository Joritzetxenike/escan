import authService from '../../src/services/authService';

import {
  buscarOperario,
  esOperarioValido,
} from '../../src/helpers/operariosHelper';

jest.mock('../../src/helpers/operariosHelper', () => ({
  buscarOperario: jest.fn(),
  esOperarioValido: jest.fn(),
}));

describe('authService', () => {

  afterEach(() => {
    jest.clearAllMocks();
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

  test('acepta una matrícula registrada y activa', async () => {
    buscarOperario.mockResolvedValue({
      matricula: '00123',
      nombre: 'Juan Pérez',
      activo: true,
    });

    const resultado = await authService.validarMatricula('00123');

    expect(resultado).toEqual({
      valida: true,
      matricula: '00123',
      nombre: 'Juan Pérez',
      error: null,
    });
  });

  test('rechaza una matrícula no registrada', async () => {
    buscarOperario.mockResolvedValue(null);

    const resultado = await authService.validarMatricula('99999');

    expect(resultado.valida).toBe(false);
    expect(resultado.matricula).toBeNull();
    expect(resultado.nombre).toBeNull();
    expect(resultado.error).toContain('no está registrada');
  });

  test('rechaza una matrícula desactivada', async () => {
    buscarOperario.mockResolvedValue({
      matricula: '00456',
      nombre: 'María García',
      activo: false,
    });

    const resultado = await authService.validarMatricula('00456');

    expect(resultado.valida).toBe(false);
    expect(resultado.matricula).toBeNull();
    expect(resultado.nombre).toBe('María García');
    expect(resultado.error).toContain('desactivada');
  });

  test('guarda y cierra la sesión en memoria con nombre', () => {
    expect(authService.haySesion()).toBe(false);

    const sesion = authService.iniciarSesion('0042', 'Operario Prueba');

    expect(sesion.matricula).toBe('0042');
    expect(sesion.nombre).toBe('Operario Prueba');
    expect(authService.haySesion()).toBe(true);
    expect(authService.obtenerMatricula()).toBe('0042');
    expect(authService.obtenerNombre()).toBe('Operario Prueba');

    authService.cerrarSesion();

    expect(authService.haySesion()).toBe(false);
    expect(authService.obtenerMatricula()).toBeNull();
    expect(authService.obtenerNombre()).toBeNull();
  });

});

import InventoryService from '../../src/services/InventoryService';
import DataProvider from '../../src/providers/DataProvider';
import conectividadService from '../../src/services/conectividadService';
import pendientesService from '../../src/services/pendientesService';
import maestrosService from '../../src/services/maestrosService';
import * as FileSystem from 'expo-file-system/legacy';

// Mockeamos el proveedor y la conectividad para NO tocar
// ni la base de datos ni Supabase durante los tests.
jest.mock('../../src/providers/DataProvider', () => ({
  obtenerArticulosUbicacion: jest.fn(),
  guardarMovimiento: jest.fn(),
  actualizarMovimiento: jest.fn(),
  obtenerArticulo: jest.fn(),
  obtenerUbicacion: jest.fn(),
  eliminarMovimiento: jest.fn(),
  finalizarUbicacion: jest.fn(),
}));

jest.mock('../../src/services/conectividadService', () => ({
  estaOnline: jest.fn(),
  marcarConexion: jest.fn(),
  marcarSinConexion: jest.fn(),
  sincronizar: jest.fn(),
  refrescarPendientes: jest.fn(),
}));

jest.mock('../../src/services/pendientesService', () => ({
  TIPOS: {
    GUARDAR: 'guardar',
    ACTUALIZAR: 'actualizar',
    ELIMINAR: 'eliminar',
    FINALIZAR: 'finalizar',
  },
  encolar: jest.fn(),
  quitar: jest.fn(),
  contar: jest.fn(),
  listar: jest.fn(),
  registrarFallo: jest.fn(),
  tieneFinalizacionPendiente: jest.fn(),
  vaciar: jest.fn(),
}));

// La validación ya no consulta Supabase: va contra la copia
// local del maestro.
jest.mock('../../src/services/maestrosService', () => ({
  DIAS_PELIGROSO: 7,
  SIN_CONEXION: 'Sin conexión',
  asegurarListo: jest.fn(),
  existeArticulo: jest.fn(),
  esSIC: jest.fn(),
  existeUbicacion: jest.fn(),
  obtenerEstado: jest.fn(() => ({ error: null })),
}));

// Sistema de ficheros en memoria
const mockArchivos = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  getInfoAsync: jest.fn(async (path) => ({
    exists: Object.prototype.hasOwnProperty.call(
      mockArchivos,
      path
    ),
  })),
  readAsStringAsync: jest.fn(
    async (path) => mockArchivos[path] ?? ''
  ),
  writeAsStringAsync: jest.fn(async (path, contenido) => {
    mockArchivos[path] = contenido;
  }),
}));

describe('InventoryService', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    Object.keys(mockArchivos).forEach(
      (key) => delete mockArchivos[key]
    );

    conectividadService.estaOnline.mockResolvedValue(true);

    pendientesService.encolar.mockResolvedValue({
      operation_id: 'op-1',
    });

    pendientesService.tieneFinalizacionPendiente
      .mockResolvedValue(false);

    maestrosService.asegurarListo.mockResolvedValue(true);
    maestrosService.existeArticulo.mockReturnValue(true);
    maestrosService.esSIC.mockReturnValue(false);
    maestrosService.existeUbicacion.mockReturnValue(true);
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

      expect(conectividadService.marcarConexion)
        .toHaveBeenCalled();

      expect(resultado).toEqual(articulos);
    });

    test('sin conexión lee los artículos del CSV local', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      mockArchivos['file:///test/A1.csv'] =
        'A1,123456,5\nA1,999999,10';

      const resultado =
        await InventoryService.cargarUbicacion('A1');

      expect(
        DataProvider.obtenerArticulosUbicacion
      ).not.toHaveBeenCalled();

      expect(resultado).toEqual([
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
        { ubicacion: 'A1', articulo: '999999', cantidad: 10 },
      ]);
    });

    test('cae al CSV si la petición falla por red', async () => {

      mockArchivos['file:///test/A1.csv'] = 'A1,123456,5';

      DataProvider.obtenerArticulosUbicacion
        .mockRejectedValue(
          new TypeError('Network request failed')
        );

      const resultado =
        await InventoryService.cargarUbicacion('A1');

      expect(conectividadService.marcarSinConexion)
        .toHaveBeenCalled();

      expect(resultado).toEqual([
        { ubicacion: 'A1', articulo: '123456', cantidad: 5 },
      ]);
    });

  });


  // =====================================================
  // guardarMovimiento
  // =====================================================

  describe('guardarMovimiento', () => {

    const movimiento = {
      ubicacion: 'A1',
      articulo: '123456',
      cantidad: 10,
    };

    test('con conexión guarda en el CSV y en Supabase', async () => {

      DataProvider.guardarMovimiento.mockResolvedValue(true);

      const resultado =
        await InventoryService.guardarMovimiento(movimiento);

      expect(
        DataProvider.guardarMovimiento
      ).toHaveBeenCalledWith(movimiento);

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,10'
      );

      expect(pendientesService.encolar).not.toHaveBeenCalled();

      expect(resultado).toEqual({
        pendiente: false,
        resultado: true,
      });
    });

    test('sin conexión guarda en el CSV y encola sin llamar a Supabase', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      const resultado =
        await InventoryService.guardarMovimiento(movimiento);

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,10'
      );

      expect(
        DataProvider.guardarMovimiento
      ).not.toHaveBeenCalled();

      expect(pendientesService.encolar).toHaveBeenCalledWith({
        tipo: 'guardar',
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 10,
        provisional: false,
        ubicacionProvisional: false,
      });

      expect(resultado).toEqual({ pendiente: true });
    });

    test('si la petición falla por red encola la operación', async () => {

      DataProvider.guardarMovimiento.mockRejectedValue(
        new TypeError('Network request failed')
      );

      const resultado =
        await InventoryService.guardarMovimiento(movimiento);

      expect(conectividadService.marcarSinConexion)
        .toHaveBeenCalled();

      expect(pendientesService.encolar).toHaveBeenCalled();

      expect(resultado).toEqual({ pendiente: true });
    });

    test('propaga los errores que no son de red', async () => {

      DataProvider.guardarMovimiento.mockRejectedValue(
        new Error('violates foreign key constraint')
      );

      await expect(
        InventoryService.guardarMovimiento(movimiento)
      ).rejects.toThrow('violates foreign key constraint');

      expect(pendientesService.encolar).not.toHaveBeenCalled();
    });

    test('marca el artículo como provisional si se escaneó sin validar', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      await InventoryService.guardarMovimiento(movimiento, {
        provisionalArticulo: true,
        ubicacionProvisional: true,
      });

      expect(pendientesService.encolar).toHaveBeenCalledWith(
        expect.objectContaining({
          provisional: true,
          ubicacionProvisional: true,
        })
      );
    });

  });


  // =====================================================
  // actualizarMovimiento
  // =====================================================

  describe('actualizarMovimiento', () => {

    const movimiento = {
      ubicacion: 'A1',
      articulo: '123456',
      cantidad: 3,
    };

    test('con conexión actualiza en Supabase y en el CSV', async () => {

      DataProvider.actualizarMovimiento.mockResolvedValue(true);

      const resultado =
        await InventoryService.actualizarMovimiento(movimiento);

      expect(
        DataProvider.actualizarMovimiento
      ).toHaveBeenCalledWith(movimiento);

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,3'
      );

      expect(resultado.pendiente).toBe(false);
    });

    test('sin conexión encola la actualización', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      const resultado =
        await InventoryService.actualizarMovimiento(movimiento);

      expect(
        DataProvider.actualizarMovimiento
      ).not.toHaveBeenCalled();

      expect(pendientesService.encolar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'actualizar',
          cantidad: 3,
        })
      );

      expect(resultado).toEqual({ pendiente: true });
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

    test('debe rechazar un artículo que no está en la copia local', async () => {
      maestrosService.existeArticulo.mockReturnValue(false);

      const resultado =
        await InventoryService.validarArticulo(
          '999999',
          'A1',
          []
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Artículo no encontrado');
      expect(resultado.mensaje).toContain(
        'El código 999999 no está en la copia local del maestro'
      );
    });

    test('debe aceptar un artículo válido', async () => {
      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          []
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(false);
      expect(resultado.provisional).toBe(false);
    });

    test('debe marcar esSIC si el artículo es SIC', async () => {
      maestrosService.esSIC.mockReturnValue(true);

      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          []
        );

      expect(resultado.ok).toBe(true);
      expect(resultado.esSIC).toBe(true);
    });

    test('NUNCA consulta Supabase para validar', async () => {
      await InventoryService.validarArticulo(
        '123456',
        'A1',
        []
      );

      expect(
        DataProvider.obtenerArticulo
      ).not.toHaveBeenCalled();
    });

    test('rechaza si no hay copia del maestro', async () => {
      maestrosService.asegurarListo.mockResolvedValue(false);

      const resultado =
        await InventoryService.validarArticulo(
          '123456',
          'A1',
          []
        );

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Sin copia de maestros');
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

    test('debe rechazar una ubicación que no está en la copia local', async () => {
      maestrosService.existeUbicacion.mockReturnValue(false);

      const resultado =
        await InventoryService.validarUbicacion('LIN2-A99-Z99');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Ubicación no encontrada');
      expect(resultado.mensaje).toContain(
        'El código LIN2-A99-Z99 no está en la copia local del maestro'
      );
    });

    test('debe aceptar una ubicación válida', async () => {
      const resultado =
        await InventoryService.validarUbicacion('LIN2-A01-Z01');

      expect(resultado.ok).toBe(true);
      expect(resultado.ubicacion).toEqual({
        ubicacion: 'LIN2-A01-Z01',
        stat: null,
      });
      expect(resultado.ubicacionProvisional).toBe(false);
    });

    test('si falta la copia de ubicaciones, rechaza', async () => {
      /* `null` = "no se sabe si el código existe". No se
         acepta por formato como antes: al poder teclear
         ubicaciones, eso dejaría pasar códigos inventados. */
      maestrosService.existeUbicacion.mockReturnValue(null);

      const resultado =
        await InventoryService.validarUbicacion('LIN2-A01-Z01');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe(
        'Sin copia de ubicaciones'
      );
    });

    test('NUNCA consulta Supabase para validar', async () => {
      await InventoryService.validarUbicacion('LIN2-A01-Z01');

      expect(
        DataProvider.obtenerUbicacion
      ).not.toHaveBeenCalled();
    });

    test('rechaza un formato inválido sin tocar la copia', async () => {
      const resultado =
        await InventoryService.validarUbicacion('LIN2');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Ubicación inválida');

      expect(
        maestrosService.asegurarListo
      ).not.toHaveBeenCalled();
    });

    test('rechaza si no hay copia del maestro', async () => {
      maestrosService.asegurarListo.mockResolvedValue(false);

      const resultado =
        await InventoryService.validarUbicacion('LIN2-A01-Z01');

      expect(resultado.ok).toBe(false);
      expect(resultado.titulo).toBe('Sin copia de maestros');
    });

  });


  // =====================================================
  // eliminarMovimiento
  // =====================================================

  describe('eliminarMovimiento', () => {

    test('debe eliminar en la BD y en el CSV', async () => {

      DataProvider.eliminarMovimiento.mockResolvedValue(true);

      mockArchivos['file:///test/A1.csv'] =
        'A1,123456,5\nA1,999999,10';

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

      expect(resultado).toEqual({
        pendiente: false,
        resultado: true,
      });
    });

    test('sin conexión borra del CSV y encola el borrado', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      mockArchivos['file:///test/A1.csv'] =
        'A1,123456,5\nA1,999999,10';

      const resultado =
        await InventoryService.eliminarMovimiento(
          'A1',
          '123456'
        );

      expect(
        DataProvider.eliminarMovimiento
      ).not.toHaveBeenCalled();

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,999999,10'
      );

      expect(pendientesService.encolar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'eliminar',
          ubicacion: 'A1',
          articulo: '123456',
        })
      );

      expect(resultado).toEqual({ pendiente: true });
    });

  });


  // =====================================================
  // finalizarUbicacion
  // =====================================================

  describe('finalizarUbicacion', () => {

    test('debe delegar la finalización al DataProvider', async () => {

      DataProvider.finalizarUbicacion.mockResolvedValue(true);

      const resultado =
        await InventoryService.finalizarUbicacion(
          'LIN2-A01-Z01'
        );

      expect(DataProvider.finalizarUbicacion)
        .toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(pendientesService.encolar).not.toHaveBeenCalled();

      expect(resultado).toEqual({
        pendiente: false,
        resultado: true,
      });
    });

    test('sin conexión encola la finalización', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      const resultado =
        await InventoryService.finalizarUbicacion(
          'LIN2-A01-Z01'
        );

      expect(
        DataProvider.finalizarUbicacion
      ).not.toHaveBeenCalled();

      expect(pendientesService.encolar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'finalizar',
          ubicacion: 'LIN2-A01-Z01',
        })
      );

      expect(resultado).toEqual({ pendiente: true });
    });

  });


  // =====================================================
  // estaUbicacionFinalizada
  // =====================================================

  describe('estaUbicacionFinalizada', () => {

    test('debe devolver true si la ubicación está en Fin', async () => {

      DataProvider.obtenerUbicacion.mockResolvedValue({
        seccion: 'LIN2',
        area: '111',
        subzona: 'Z101',
        stat: 'Fin',
      });

      const resultado =
        await InventoryService.estaUbicacionFinalizada(
          'LIN2-A01-Z01'
        );

      expect(DataProvider.obtenerUbicacion)
        .toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(resultado).toBe(true);
    });

    test('debe devolver false si la ubicación no está en Fin', async () => {

      DataProvider.obtenerUbicacion.mockResolvedValue({
        seccion: 'LIN2',
        area: '111',
        subzona: 'Z101',
        stat: 'Inicio',
      });

      const resultado =
        await InventoryService.estaUbicacionFinalizada(
          'LIN2-A01-Z01'
        );

      expect(resultado).toBe(false);
    });

    test('sin conexión consulta la cola de pendientes', async () => {

      conectividadService.estaOnline.mockResolvedValue(false);

      pendientesService.tieneFinalizacionPendiente
        .mockResolvedValue(true);

      const resultado =
        await InventoryService.estaUbicacionFinalizada(
          'LIN2-A01-Z01'
        );

      expect(
        pendientesService.tieneFinalizacionPendiente
      ).toHaveBeenCalledWith('LIN2-A01-Z01');

      expect(DataProvider.obtenerUbicacion)
        .not.toHaveBeenCalled();

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


  // =====================================================
  // CONECTIVIDAD
  // =====================================================

  describe('sincronizarPendientes', () => {

    test('delega en el servicio de conectividad', async () => {

      const resumen = { aplicadas: 2, fallidas: 0 };

      conectividadService.sincronizar.mockResolvedValue(
        resumen
      );

      const resultado =
        await InventoryService.sincronizarPendientes();

      expect(resultado).toEqual(resumen);
    });

  });

});
import * as FileSystem from 'expo-file-system/legacy';

import CsvProvider from '../../src/providers/csv/csvProvider';


// =====================================================
// MOCK FILE SYSTEM
// =====================================================

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));


describe('CsvProvider', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // =====================================================
  // obtenerArticulosUbicacion
  // =====================================================

  describe('obtenerArticulosUbicacion', () => {

    test('debe devolver [] si el archivo no existe', async () => {

      FileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
      });

      const resultado =
        await CsvProvider.obtenerArticulosUbicacion('A1');

      expect(resultado).toEqual([]);

      expect(
        FileSystem.getInfoAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv'
      );

      expect(
        FileSystem.readAsStringAsync
      ).not.toHaveBeenCalled();

    });


    test('debe leer y convertir correctamente los registros', async () => {

      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      FileSystem.readAsStringAsync.mockResolvedValue(
        'A1,123456,5\nA1,999999,10'
      );

      const resultado =
        await CsvProvider.obtenerArticulosUbicacion('A1');

      expect(resultado).toEqual([
        {
          ubicacion: 'A1',
          articulo: '123456',
          cantidad: 5,
        },
        {
          ubicacion: 'A1',
          articulo: '999999',
          cantidad: 10,
        },
      ]);

      expect(
        FileSystem.readAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv'
      );

    });


    test('debe devolver [] si ocurre un error al leer', async () => {

      FileSystem.getInfoAsync.mockRejectedValue(
        new Error('Error de lectura')
      );

      const resultado =
        await CsvProvider.obtenerArticulosUbicacion('A1');

      expect(resultado).toEqual([]);

    });

  });


  // =====================================================
  // guardarMovimiento
  // =====================================================

  describe('guardarMovimiento', () => {

    test('debe crear un nuevo registro si el artículo no existe', async () => {

      // El archivo existe
      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      // Actualmente no hay registros
      FileSystem.readAsStringAsync.mockResolvedValue('');

      FileSystem.writeAsStringAsync.mockResolvedValue();

      await CsvProvider.guardarMovimiento({
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 5,
      });

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,5'
      );

    });


    test('debe actualizar la cantidad de un artículo existente', async () => {

      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      FileSystem.readAsStringAsync.mockResolvedValue(
        'A1,123456,5\nA1,999999,10'
      );

      FileSystem.writeAsStringAsync.mockResolvedValue();

      await CsvProvider.guardarMovimiento({
        ubicacion: 'A1',
        articulo: '123456',
        cantidad: 20,
      });

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,20\nA1,999999,10'
      );

    });


    test('debe añadir un artículo nuevo manteniendo los existentes', async () => {

      FileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      FileSystem.readAsStringAsync.mockResolvedValue(
        'A1,123456,5'
      );

      FileSystem.writeAsStringAsync.mockResolvedValue();

      await CsvProvider.guardarMovimiento({
        ubicacion: 'A1',
        articulo: '999999',
        cantidad: 10,
      });

      expect(
        FileSystem.writeAsStringAsync
      ).toHaveBeenCalledWith(
        'file:///test/A1.csv',
        'A1,123456,5\nA1,999999,10'
      );

    });

  });


  // =====================================================
  // estaDisponible
  // =====================================================

  describe('estaDisponible', () => {

    test('debe devolver true', async () => {

      const resultado =
        await CsvProvider.estaDisponible();

      expect(resultado).toBe(true);

    });

  });


  // =====================================================
  // sincronizar
  // =====================================================

  describe('sincronizar', () => {

    test('debe devolver true', async () => {

      const resultado =
        await CsvProvider.sincronizar();

      expect(resultado).toBe(true);

    });

  });

});

test('debe ignorar líneas vacías del CSV', async () => {

  FileSystem.getInfoAsync.mockResolvedValue({
    exists: true,
  });

  FileSystem.readAsStringAsync.mockResolvedValue(
    'A1,123456,5\n\n'
  );

  const resultado =
    await CsvProvider.obtenerArticulosUbicacion('A1');

  expect(resultado).toEqual([
    {
      ubicacion: 'A1',
      articulo: '123456',
      cantidad: 5,
    },
  ]);

});


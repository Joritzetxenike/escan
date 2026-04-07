jest.mock('../helpers/csvHelper', () => ({
  guardarRegistro: jest.fn(),
  leerCsv: jest.fn().mockResolvedValue([
    { ubicacion: 'A1', articulo: '123', cantidad: 5 },
  ]),
}));

const { guardarRegistro, leerCsv } = require('../helpers/csvHelper');

describe('CSV Helper (mock)', () => {

  it('devuelve datos simulados', async () => {
    const datos = await leerCsv();

    expect(datos).toHaveLength(1);
    expect(datos[0]).toMatchObject({
      ubicacion: 'A1',
      articulo: '123',
      cantidad: 5,
    });
  });

});
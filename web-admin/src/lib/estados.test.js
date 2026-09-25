import { describe, expect, test } from 'vitest';
import { resumirEstados } from '../lib/estados';

describe('resumirEstados', () => {
  test('calcula totales y porcentajes por nivel', () => {
    const resumen = resumirEstados([
      {
        seccion: '01',
        stat: 'Proceso',
        maestroArea: [
          {
            area: 'A',
            stat: 'Proceso',
            maestroUbicacion: [
              { subzona: 'Z1', stat: 'Fin' },
              { subzona: 'Z2', stat: 'Proceso' },
            ],
          },
          {
            area: 'B',
            stat: 'Inicio',
            maestroUbicacion: [{ subzona: 'Z1', stat: 'Inicio' }],
          },
        ],
      },
    ]);

    expect(resumen.secciones.total).toBe(1);
    expect(resumen.secciones.desglose.Proceso.cantidad).toBe(1);
    expect(resumen.areas.total).toBe(2);
    expect(resumen.ubicaciones.total).toBe(3);
    expect(resumen.ubicaciones.desglose.Fin.porcentaje).toBe(33);
    expect(resumen.ubicaciones.desglose.Inicio.porcentaje).toBe(33);
    expect(resumen.ubicaciones.desglose.Proceso.porcentaje).toBe(33);
  });

  test('devuelve cero cuando no hay ubicaciones', () => {
    const resumen = resumirEstados([]);

    expect(resumen.ubicaciones.total).toBe(0);
    expect(resumen.ubicaciones.desglose.Fin.porcentaje).toBe(0);
  });
});

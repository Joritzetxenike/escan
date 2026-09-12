import { resumirEstados } from '../../src/helpers/estadosResumenHelper';

describe('resumirEstados', () => {

  test('calcula totales y porcentajes de cada entidad', () => {
    const arbol = [
      {
        seccion: '50100',
        stat: 'Fin',
        maestroArea: [
          {
            area: '111',
            stat: 'Fin',
            maestroUbicacion: [
              { subzona: 'Z101', stat: 'Fin' },
              { subzona: 'Z102', stat: 'Proceso' },
              { subzona: 'Z103', stat: 'Inicio' },
            ],
          },
        ],
      },
      {
        seccion: '50200',
        stat: 'Proceso',
        maestroArea: [
          {
            area: '222',
            stat: 'Inicio',
            maestroUbicacion: [
              { subzona: 'Z201', stat: 'Inicio' },
            ],
          },
        ],
      },
    ];

    const resumen = resumirEstados(arbol);

    expect(resumen.secciones.total).toBe(2);
    expect(resumen.secciones.desglose.Fin).toEqual({ cantidad: 1, porcentaje: 50 });
    expect(resumen.secciones.desglose.Proceso).toEqual({ cantidad: 1, porcentaje: 50 });
    expect(resumen.secciones.desglose.Inicio).toEqual({ cantidad: 0, porcentaje: 0 });

    expect(resumen.areas.total).toBe(2);
    expect(resumen.areas.desglose.Fin).toEqual({ cantidad: 1, porcentaje: 50 });
    expect(resumen.areas.desglose.Inicio).toEqual({ cantidad: 1, porcentaje: 50 });

    expect(resumen.ubicaciones.total).toBe(4);
    expect(resumen.ubicaciones.desglose.Fin).toEqual({ cantidad: 1, porcentaje: 25 });
    expect(resumen.ubicaciones.desglose.Proceso).toEqual({ cantidad: 1, porcentaje: 25 });
    expect(resumen.ubicaciones.desglose.Inicio).toEqual({ cantidad: 2, porcentaje: 50 });
  });

  test('redondea los porcentajes y el vacío devuelve totales 0', () => {
    const arbol = [
      {
        seccion: '50100',
        stat: 'Otro',
        maestroArea: [
          {
            area: '111',
            stat: 'Fin',
            maestroUbicacion: [
              { subzona: 'Z101', stat: 'Fin' },
              { subzona: 'Z102', stat: 'Fin' },
              { subzona: 'Z103', stat: 'Proceso' },
            ],
          },
        ],
      },
    ];

    const resumen = resumirEstados(arbol);

    // Estado desconocido no se cuenta en ningún bloque
    expect(resumen.secciones.desglose.Fin).toEqual({ cantidad: 0, porcentaje: 0 });

    // 2/3 Fin => 67% (redondeado)
    expect(resumen.ubicaciones.desglose.Fin).toEqual({ cantidad: 2, porcentaje: 67 });
    expect(resumen.ubicaciones.desglose.Proceso).toEqual({ cantidad: 1, porcentaje: 33 });

    const vacio = resumirEstados([]);
    expect(vacio.secciones.total).toBe(0);
    expect(vacio.secciones.desglose.Fin).toEqual({ cantidad: 0, porcentaje: 0 });
  });

});
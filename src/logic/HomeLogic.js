import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import InventoryService from '../services/InventoryService';
import useConectividad from './useConectividad';

export function useHomeLogic(navigation) {

  /* =====================================================
   * ESTADO
   * ===================================================== */

  const [ubicacion, setUbicacion] = useState(null);

  const [ubicacionFinalizada, setUbicacionFinalizada] =
    useState(false);

/* ---------- Sin conexión ---------- */

  /* La ubicación se escaneó sin poder validarla contra el
     maestro: se comprueba al sincronizar */

  const [ubicacionSinValidar, setUbicacionSinValidar] =
    useState(false);

  /* El artículo se aceptó sin poder validarlo contra
     el maestro: se comprueba al sincronizar */

  const [articuloSinValidar, setArticuloSinValidar] =
    useState(false);

  const [articuloTemp, setArticuloTemp] = useState(null);

  const [mostrarCantidad, setMostrarCantidad] = useState(false);

  const [ultimosArticulos, setUltimosArticulos] = useState([]);

  const [escaneadosSesion, setEscaneadosSesion] = useState([]);

  const [mostrarManual, setMostrarManual] = useState(false);

  const [codigoManual, setCodigoManual] = useState('');

  const [mostrarManualUbicacion, setMostrarManualUbicacion] =
    useState(false);

  const conectividad = useConectividad();


  /* =====================================================
   * NAVEGACIÓN AL SCANNER
   * ===================================================== */

  const abrirScannerUbicacion = () => {

    navigation.navigate('Scanner', {

      tipo: 'ubicacion',

      onScan: ({ codigo }) => {
        procesarEscaneo('ubicacion', codigo);
      },

    });

  };


  const avisoSinUbicacion = () => {

    Alert.alert(
      'Error',
      'Primero escanea una ubicación'
    );

  };


  const abrirScannerArticulo = () => {

    if (!ubicacion) {
      avisoSinUbicacion();
      return;
    }

    navigation.navigate('Scanner', {

      tipo: 'articulo',

      onScan: ({ codigo }) => {
        procesarEscaneo('articulo', codigo);
      },

    });

  };


  /* =====================================================
 * ENTRADA MANUAL
 * =====================================================
 *
 * Antes esto estaba bloqueado sin conexión porque el código se
 * validaba contra el maestro, que solo era accesible en red.
 * Con la copia local del maestro ya no hace falta: la
 * validación es local y si no hay copia sale el aviso de
 * "Sin copia de maestros", que es lo mismo que ve el operario
 * al escanear.
 * ===================================================== */

  const abrirModalManual = () => {

    if (!ubicacion) {
      avisoSinUbicacion();
      return;
    }

    setMostrarManual(true);

  };


  const abrirModalManualUbicacion = () => {

    /* No se exige ubicación previa: la ubicación es
       precisamente lo que se está introduciendo. */

    setMostrarManualUbicacion(true);

  };


  /* =====================================================
   * UBICACIÓN
   * =====================================================
   *
   * La normalización vive aquí y no en el modal porque este es
   * el único punto por el que pasan tanto el escáner como la
   * entrada manual: así no puede quedar en el estado una
   * ubicación en minúsculas y otra en mayúsculas. Sobre el
   * escaneo es un no-op, las etiquetas ya vienen en mayúsculas.
   */

  const normalizarUbicacion = (codigo) =>
    String(codigo ?? '').trim().toUpperCase();

  const cargarUbicacion = async (codigo) => {

    const codigoNormalizado =
      normalizarUbicacion(codigo);

    try {

      const resultado =
        await InventoryService.validarUbicacion(
          codigoNormalizado
        );

      if (!resultado.ok) {

        Alert.alert(
          resultado.titulo,
          resultado.mensaje
        );

        return false;
      }

      setUbicacion(codigoNormalizado);

      setUbicacionFinalizada(
        resultado.ubicacion?.stat === 'Fin'
      );

      setUbicacionSinValidar(
        resultado.ubicacionProvisional === true
      );

      await InventoryService.cargarUbicacion(
        codigoNormalizado
      );

      // Reiniciamos los artículos escaneados
      // para la nueva ubicación
      setEscaneadosSesion([]);

      return true;

    } catch (e) {

      console.error(
        'Error cargando ubicación:',
        e
      );

      throw e;
    }

  };


  /* =====================================================
   * ARTÍCULO
   * ===================================================== */

  const procesarArticulo = async (codigo) => {

    /* ---------- UBICACIÓN TERMINADA ---------- */

    if (ubicacionFinalizada) {

      Alert.alert(
        'Ubicación terminada',
        `La ubicación ${ubicacion} está terminada y no admite más artículos`
      );

      return;
    }

    const resultado =
      await InventoryService.validarArticulo(
        codigo,
        ubicacion,
        escaneadosSesion
      );


    /* ---------- ARTÍCULO NO VÁLIDO ---------- */

    if (!resultado.ok) {

      Alert.alert(
        resultado.titulo,
        resultado.mensaje
      );

      return;
    }


    /* ---------- AVISO SIC ---------- */

    if (resultado.esSIC) {

      Alert.alert(
        'Artículo SIC',
        `El código ${codigo} es un SIC. Asegúrate de que sea el artículo correcto antes de continuar.`
      );

    }


    /* ---------- ARTÍCULO VÁLIDO ---------- */

    setArticuloSinValidar(
      resultado.provisional === true
    );

    setArticuloTemp(codigo);

    setEscaneadosSesion(
      prev => [
        ...prev,
        codigo,
      ]
    );

    setMostrarCantidad(true);

  };


  /* =====================================================
   * PROCESAR RESULTADO DEL SCANNER
   * ===================================================== */

  const procesarEscaneo = async (
    tipo,
    codigo
  ) => {

    try {

      console.log(
        'Procesando escaneo:',
        tipo,
        codigo
      );
/* ---------- UBICACIÓN ---------- */

      if (tipo === 'ubicacion') {

        return await cargarUbicacion(codigo);

      }


      /* ---------- ARTÍCULO ---------- */

      if (tipo === 'articulo') {

        await procesarArticulo(codigo);

        return true;

      }


      /* ---------- TIPO DESCONOCIDO ---------- */

      console.warn(
        'Tipo de escaneo desconocido:',
        tipo
      );

      return false;

    } catch (e) {

      console.error(e);

      Alert.alert(
        'Error',
        'Error procesando el código'
      );

      return false;

    }

  };


  /* =====================================================
   * REVALIDAR UBICACIÓN AL VOLVER A HOME
   * ===================================================== */

  useFocusEffect(
    useCallback(() => {

      if (!ubicacion) return;

      let activo = true;

      (async () => {
        try {
          const finalizada =
            await InventoryService.estaUbicacionFinalizada(
              ubicacion
            );

          if (activo) {
            setUbicacionFinalizada(finalizada);
          }
        } catch (e) {
          console.error(
            'Error revalidando ubicación:',
            e
          );
        }
      })();

      return () => {
        activo = false;
      };

    }, [ubicacion])
  );


  /* =====================================================
   * CÓDIGO MANUAL
   * ===================================================== */

  const onManualCode = (codigo) => {

    procesarEscaneo(
      'articulo',
      codigo
    );

  };


  /**
   * Devuelve `true` si la ubicación es válida, para que el
   * modal pueda seguir abierto cuando el código tecleado no
   * existe: con tres partes es fácil equivocarse y obligar a
   * volver a pulsarlo sería un fastidio.
   */
  const onManualUbicacion = (codigo) =>
    procesarEscaneo('ubicacion', codigo);


  /* =====================================================
   * LIMPIAR ARTÍCULO
   * ===================================================== */

  const limpiarArticulo = () => {

    setArticuloTemp(null);

    setArticuloSinValidar(false);

    setCodigoManual('');

    setMostrarManual(false);

    setMostrarCantidad(false);

  };


  /* =====================================================
   * DESCARTAR ARTÍCULO
   * =====================================================
   *
   * El código se reserva en `escaneadosSesion` al validarlo,
   * antes de que exista movimiento guardado, para que un
   * doble escaneo no abra dos veces el modal. Al cancelar hay
   * que devolver esa reserva: si no, el artículo queda
   * marcado como escaneado y al volver a leerlo el validador
   * lo rechaza por duplicado.
   */

  const descartarArticulo = () => {

    setEscaneadosSesion(
      prev => prev.filter(
        c => c !== articuloTemp
      )
    );

    limpiarArticulo();

  };


  /* =====================================================
   * CONFIRMAR CANTIDAD
   * ===================================================== */

  const confirmarCantidad = async (
    cantidad
  ) => {

    try {

      const movimiento =
InventoryService.crearMovimiento(
          ubicacion,
          articuloTemp,
          cantidad
        );


      const resultado =
        await InventoryService.guardarMovimiento(
          movimiento,
          {
            provisionalArticulo: articuloSinValidar,
            ubicacionProvisional: ubicacionSinValidar,
          }
        );


      /* ---------- ACTUALIZAR ÚLTIMOS ---------- */

      setUltimosArticulos(
        prev => [
          {
            ...movimiento,
            pendiente: resultado?.pendiente === true,
          },
          ...prev,
        ].slice(0, 5)
      );


      /* ---------- LIMPIAR ---------- */

      limpiarArticulo();

    } catch (e) {

      console.error(e);

      Alert.alert(
        'Error',
        'No se pudo guardar el registro'
      );

    }

  };


  /* =====================================================
   * RETURN
   * ===================================================== */

  return {

    /* ---------- ESTADO ---------- */

    ubicacion,

    ubicacionFinalizada,

    ubicacionSinValidar,

    articuloTemp,

    articuloSinValidar,

    mostrarCantidad,

    ultimosArticulos,


    /* ---------- CONECTIVIDAD ---------- */

    conectividad,


    /* ---------- SCANNER ---------- */

    abrirScannerUbicacion,

    abrirScannerArticulo,


    /* ---------- PROCESAMIENTO ---------- */

    procesarEscaneo,

    onManualCode,

    onManualUbicacion,


    /* ---------- CANTIDAD ---------- */

    confirmarCantidad,

    descartarArticulo,

    setMostrarCantidad,


    /* ---------- MODAL MANUAL ---------- */

    mostrarManual,

    abrirModalManual,

    setMostrarManual,

    codigoManual,

    setCodigoManual,


    /* ---------- MODAL MANUAL DE UBICACIÓN ---------- */

    mostrarManualUbicacion,

    abrirModalManualUbicacion,

    setMostrarManualUbicacion,

  };

}
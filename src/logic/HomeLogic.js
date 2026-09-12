import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import InventoryService from '../services/InventoryService';

export function useHomeLogic(navigation) {

  /* =====================================================
   * ESTADO
   * ===================================================== */

  const [ubicacion, setUbicacion] = useState(null);

  const [ubicacionFinalizada, setUbicacionFinalizada] =
    useState(false);

  const [articuloTemp, setArticuloTemp] = useState(null);

  const [mostrarCantidad, setMostrarCantidad] = useState(false);

  const [ultimosArticulos, setUltimosArticulos] = useState([]);

  const [escaneadosSesion, setEscaneadosSesion] = useState([]);

  const [mostrarManual, setMostrarManual] = useState(false);

  const [codigoManual, setCodigoManual] = useState('');


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


  const abrirModalManual = () => {

    if (!ubicacion) {
      avisoSinUbicacion();
      return;
    }

    setMostrarManual(true);

  };


  /* =====================================================
   * UBICACIÓN
   * ===================================================== */

  const cargarUbicacion = async (codigo) => {

    try {

      const resultado =
        await InventoryService.validarUbicacion(codigo);

      if (!resultado.ok) {

        Alert.alert(
          resultado.titulo,
          resultado.mensaje
        );

        return null;
      }

      setUbicacion(codigo);

      setUbicacionFinalizada(
        resultado.ubicacion?.stat === 'Fin'
      );

      const articulos =
        await InventoryService.cargarUbicacion(codigo);

      // Reiniciamos los artículos escaneados
      // para la nueva ubicación
      setEscaneadosSesion([]);

      return articulos;

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

        await cargarUbicacion(codigo);

        return;
      }


      /* ---------- ARTÍCULO ---------- */

      if (tipo === 'articulo') {

        await procesarArticulo(codigo);

        return;
      }


      /* ---------- TIPO DESCONOCIDO ---------- */

      console.warn(
        'Tipo de escaneo desconocido:',
        tipo
      );

    } catch (e) {

      console.error(e);

      Alert.alert(
        'Error',
        'Error procesando el código'
      );

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


  /* =====================================================
   * LIMPIAR ARTÍCULO
   * ===================================================== */

  const limpiarArticulo = () => {

    setArticuloTemp(null);

    setCodigoManual('');

    setMostrarManual(false);

    setMostrarCantidad(false);

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


      await InventoryService.guardarMovimiento(
        movimiento
      );


      /* ---------- ACTUALIZAR ÚLTIMOS ---------- */

      setUltimosArticulos(
        prev => [
          movimiento,
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

    articuloTemp,

    mostrarCantidad,

    ultimosArticulos,


    /* ---------- SCANNER ---------- */

    abrirScannerUbicacion,

    abrirScannerArticulo,


    /* ---------- PROCESAMIENTO ---------- */

    procesarEscaneo,

    onManualCode,


    /* ---------- CANTIDAD ---------- */

    confirmarCantidad,

    setMostrarCantidad,


    /* ---------- MODAL MANUAL ---------- */

    mostrarManual,

    abrirModalManual,

    setMostrarManual,

    codigoManual,

    setCodigoManual,

  };

}
import { useState } from 'react';
import { Alert } from 'react-native';

import InventoryService from '../services/InventoryService';

export function useHomeLogic(navigation) {

  /* =====================================================
   * ESTADO
   * ===================================================== */

  const [ubicacion, setUbicacion] = useState(null);

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


  const abrirScannerArticulo = () => {

    navigation.navigate('Scanner', {

      tipo: 'articulo',

      onScan: ({ codigo }) => {
        procesarEscaneo('articulo', codigo);
      },

    });

  };


  /* =====================================================
   * UBICACIÓN
   * ===================================================== */

  const cargarUbicacion = async (codigo) => {

    try {

      setUbicacion(codigo);

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

    setMostrarManual,

    codigoManual,

    setCodigoManual,

  };

}
import { useRef, useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';

import ScannerService from '../services/ScannerService';

export function useScannerLogic(navigation, route) {

  const [permission, requestPermission] = useCameraPermissions();

  const scanBuffer = useRef({
    value: '',
    count: 0,
    lastTime: 0,
  });

  /* =====================================================
   * CONFIGURACIÓN
   * ===================================================== */

  const tipo = route.params?.tipo;

  const hintText =
    tipo === 'ubicacion'
      ? 'Escanea una ubicación'
      : 'Escanea un artículo';


  /* =====================================================
   * VOLVER
   * ===================================================== */

  const volver = () => {
    navigation.goBack();
  };


  /* =====================================================
   * RESET AUTOMÁTICO DEL BUFFER
   * ===================================================== */

  useEffect(() => {

    const interval = setInterval(() => {

      scanBuffer.current =
        ScannerService.resetBufferIfStale(
          scanBuffer.current
        );

    }, 500);

    return () => clearInterval(interval);

  }, []);


  /* =====================================================
   * CÓDIGO ESCANEADO
   * ===================================================== */

  const handleBarcodeScanned = ({ type, data }) => {

    console.log('SCAN:', type, data);

    /* ---------- VALIDACIÓN BÁSICA ---------- */

    if (!ScannerService.esCodigoValido(data)) {
      return;
    }


    /* ---------- ACTUALIZAR BUFFER ---------- */

    const resultado =
      ScannerService.actualizarBuffer(
        scanBuffer.current,
        data
      );

    scanBuffer.current = resultado.buffer;


    /* ---------- TODAVÍA NO VALIDADO ---------- */

    if (!resultado.validado) {
      return;
    }


    /* =================================================
     * CÓDIGO VALIDADO
     * ================================================= */

    console.log('CÓDIGO VALIDADO:', data);


    /* ---------- DEVOLVER RESULTADO ---------- */

    if (route.params?.onScan) {

      route.params.onScan({
        codigo: data,
        tipo: tipo,
      });

    }


    /* ---------- VOLVER A LA PANTALLA ANTERIOR ---------- */

    navigation.goBack();

  };


  /* =====================================================
   * RETURN
   * ===================================================== */

  return {

    permission,
    requestPermission,

    hintText,

    volver,

    handleBarcodeScanned,

  };
}
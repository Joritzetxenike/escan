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

  /* ---------- TEXTO ---------- */

  const hintText =
    route.params?.tipo === 'ubicacion'
      ? 'Escanea una ubicación'
      : 'Escanea un artículo';

  /* ---------- VOLVER ---------- */

  const volver = () => {
    navigation.goBack();
  };

  /* ---------- RESET AUTOMÁTICO ---------- */

  useEffect(() => {

    const interval = setInterval(() => {
      scanBuffer.current = ScannerService.resetBufferIfStale(
        scanBuffer.current
      );
    }, 500);

    return () => clearInterval(interval);

  }, []);

  /* ---------- SCANNER ---------- */

  const handleBarcodeScanned = ({ type, data }) => {

    console.log('SCAN:', type, data);

    if (!ScannerService.esCodigoValido(data))
      return;

    const resultado = ScannerService.actualizarBuffer(
      scanBuffer.current,
      data
    );

    scanBuffer.current = resultado.buffer;

    if (!resultado.validado)
      return;

    navigation.navigate(
      route.params.returnScreen,
      {
        codigo: data,
        tipo: route.params.tipo,
      }
    );
  };

  return {

    permission,
    requestPermission,

    hintText,

    volver,

    handleBarcodeScanned,

  };
}
import { useRef, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

import ScannerService from '../services/ScannerService';
import UbicacionValidator from '../validators/UbicacionValidator';
import { TOLERANCIA_MARCO } from '../constants/scannerConstants';

export function useScannerLogic(navigation, route) {

  const [permission, requestPermission] = useCameraPermissions();

  /* =====================================================
   * FLASH
   * =====================================================
   *
   * Para contar en almacenes con poca luz. `enableTorch` es
   * una prop de `CameraView`, así que basta con un estado:
   * al desmontar la pantalla (al escanear o al volver) el
   * flash se apaga solo.
   *
   * expo-camera no expone ninguna forma de saber si el
   * dispositivo tiene flash, y en web el navegador lo
   * ignora, así que allí el botón no se muestra.
   */

  const [flashActivo, setFlashActivo] =
    useState(false);

  const toggleFlash = () => {
    setFlashActivo((previo) => !previo);
  };

  const soportaFlash = Platform.OS !== 'web';

  /* =====================================================
   * MARCO DE ESCANEO
   * =====================================================
   *
   * El recuadro que se pinta en pantalla es decorativo, así
   * que hay que medirlo (`onLayout` en la vista) para poder
   * descartar los códigos que caen fuera. Las coordenadas de
   * `bounds` vienen en el espacio de la vista de la cámara
   * y el overlay ocupa la misma pantalla, así que coinciden.
   */

  const [frameRect, setFrameRect] = useState(null);

  const onFrameLayout = (event) => {
    const { x, y, width, height } = event.nativeEvent.layout;

    setFrameRect((previo) =>
      previo &&
      previo.x === x &&
      previo.y === y &&
      previo.width === width &&
      previo.height === height
        ? previo
        : { x, y, width, height }
    );
  };

  /* Sin medidas aún (primeros eventos) o sin bounds fiables
     (expo-camera puede devolver un rect vacío) se acepta:
     mejor una lectura de más que ignorar todo. */

  const dentroDelMarco = (bounds) => {

    if (!frameRect) {
      return true;
    }

    if (
      !bounds ||
      !bounds.origin ||
      !bounds.size ||
      bounds.size.width === 0 ||
      bounds.size.height === 0
    ) {
      return true;
    }

    const cx = bounds.origin.x + bounds.size.width / 2;
    const cy = bounds.origin.y + bounds.size.height / 2;

    return (
      cx >= frameRect.x - TOLERANCIA_MARCO &&
      cx <= frameRect.x + frameRect.width + TOLERANCIA_MARCO &&
      cy >= frameRect.y - TOLERANCIA_MARCO &&
      cy <= frameRect.y + frameRect.height + TOLERANCIA_MARCO
    );

  };

  const scanBuffer = useRef({
    value: '',
    count: 0,
    lastTime: 0,
  });

  const ultimoInvalido = useRef({
    code: '',
    time: 0,
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

  const handleBarcodeScanned = ({ type, data, bounds }) => {

    /* ---------- FILTRO DEL MARCO ---------- */

    /* Solo cuenta lo que se ve dentro del recuadro: sin este
       filtro cualquier código a la vista (un cartel de la
       estantería, la ubicación de al lado...) contaminaría
       el buffer o dispararía alertas. Se descarta en
       silencio para no spamear avisos. */

    if (!dentroDelMarco(bounds)) {
      return;
    }

    console.log('SCAN:', type, data);

    /* ---------- VALIDACIÓN (UBICACIÓN): FORMATO ---------- */

    if (tipo === 'ubicacion') {

      if (!UbicacionValidator.validarFormato(data)) {

        const ahora = Date.now();

        if (
          ultimoInvalido.current.code === data &&
          ahora - ultimoInvalido.current.time < 3000
        ) {
          return;
        }

        ultimoInvalido.current = {
          code: data,
          time: ahora,
        };

        Alert.alert(
          'Ubicación inválida',
          `El código ${data} no sigue el formato seccion-area-subzona (ej. LIN2-A01-Z01)`
        );

        return;
      }

      /* Si el formato es válido, continúa al buffer. */
    } else {

      /* ---------- VALIDACIÓN BÁSICA (ARTÍCULO) ---------- */

      if (!ScannerService.esCodigoValido(data)) {
        return;
      }
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

    tipo,
    hintText,

    flashActivo,
    toggleFlash,
    soportaFlash,

    frameRect,
    onFrameLayout,

    volver,

    handleBarcodeScanned,

  };
}
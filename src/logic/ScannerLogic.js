import { useEffect, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

import ScannerService from '../services/ScannerService';

import {
    RESET_INTERVAL
} from '../constants/scannerConstants';

export function useScannerLogic(onCodeScanned) {

    const [permission, requestPermission] =
        useCameraPermissions();

    const scanBuffer = useRef(
        ScannerService.crearBuffer()
    );

    const handleBarcodeScanned = ({ type, data }) => {

        const resultado =
            ScannerService.procesarLectura(
                scanBuffer.current,
                type,
                data
            );

        scanBuffer.current = resultado.buffer;

        if (resultado.valido) {
            onCodeScanned(resultado.codigo);
        }
    };

    useEffect(() => {

        const interval = setInterval(() => {

            scanBuffer.current =
                ScannerService.limpiarBufferCaducado(
                    scanBuffer.current
                );

        }, RESET_INTERVAL);

        return () => clearInterval(interval);

    }, []);

    return {
        permission,
        requestPermission,
        handleBarcodeScanned,
    };
}
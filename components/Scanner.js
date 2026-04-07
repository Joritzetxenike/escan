import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { styles } from '../styles';

export default function Scanner({ onBack, onCodeScanned, hintText }) {
  
  /* ---------- PERMISOS ---------- */
  const [permission, requestPermission] = useCameraPermissions();

  /* ---------- BUFFER DE LECTURAS ---------- */
  const scanBuffer = useRef({
    value: '',
    count: 0,
    firstSeen: 0,
  });

  /* ---------- VALIDACIÓN ---------- */
  const esCodigoValido = (data) => {
    if (!data) return false;
    if (data.length < 6) return false;
    //if (!/^[A-Z0-9]+$/i.test(data)) return false;
    return true;
  };

  /* ---------- HANDLER ---------- */
  const handleBarcodeScanned = ({ data }) => {
    if (!esCodigoValido(data)) return;

    const now = Date.now();

    if (data !== scanBuffer.current.value) {
      scanBuffer.current = {
        value: data,
        count: 1,
        firstSeen: now,
      };
      return;
    }

    scanBuffer.current.count += 1;

    const tiempo = now - scanBuffer.current.firstSeen;

    if (
      scanBuffer.current.count >= 2 &&
      tiempo < 1000
    ) {
      onCodeScanned(data);

      scanBuffer.current = {
        value: '',
        count: 0,
        firstSeen: 0,
      };
      return;
    }

    if (tiempo > 1000) {
      scanBuffer.current = {
        value: '',
        count: 0,
        firstSeen: 0,
      };
    }
  };

  /* ---------- CONTROL DE PERMISOS ---------- */

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Necesitamos permiso para usar la cámara</Text>

        <TouchableOpacity
          style={[styles.customButton, { marginTop: 20 }]}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- UI ---------- */

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean128'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.scanFrame} />

        <Text style={styles.hintText}>{hintText}</Text>
      </View>
    </View>
  );
}
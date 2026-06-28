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
    lastTime: 0,
  });

  /* ---------- VALIDACIÓN ---------- */
  const esCodigoValido = (data) => {
    if (!data) return false;
    if (data.length < 6) return false;
    return true;
  };

  /* ---------- HANDLER ---------- */
  const handleBarcodeScanned = ({ type, data }) => {
    console.log('SCAN:', type, data);

   // if (type !== 'code128') return;
    if (!esCodigoValido(data)) return;

    const now = Date.now();

    // 👉 si cambia el código, reinicia buffer
    if (scanBuffer.current.value !== data) {
      scanBuffer.current = {
        value: data,
        count: 1,
        lastTime: now,
      };
      return;
    }

    // 👉 mismo código = suma estabilidad
    scanBuffer.current.count += 1;
    scanBuffer.current.lastTime = now;

    console.log(`VALIDACIÓN ${data}: ${scanBuffer.current.count}/10`);

    // 🎯 VALIDACIÓN FINAL (10 lecturas)
    if (scanBuffer.current.count >= 10) {
      console.log('✔ CÓDIGO VALIDADO:', data);

      onCodeScanned(data);

      // reset
      scanBuffer.current = {
        value: '',
        count: 0,
        lastTime: 0,
      };
    }
  };

  /* ---------- RESET POR TIMEOUT ---------- */
  const resetIfStale = () => {
    const now = Date.now();

    if (
      scanBuffer.current.value &&
      now - scanBuffer.current.lastTime > 1200
    ) {
      scanBuffer.current = {
        value: '',
        count: 0,
        lastTime: 0,
      };
    }
  };

  setTimeout(resetIfStale, 500);

  /* ---------- PERMISOS ---------- */
  if (!permission) return <View />;

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
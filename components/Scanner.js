import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { CameraView } from 'expo-camera';
import { styles } from '../styles';

export default function Scanner({ onBack, onCodeScanned, hintText }) {
  const [escaneando, setEscaneando] = useState(false);

  const handleBarcodeScanned = ({ data }) => {
    if (escaneando) return;
    setEscaneando(true);

    onCodeScanned(data);

    setTimeout(() => setEscaneando(false), 1000);
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['code128'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Overlay */}
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

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { CameraView } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';

import { styles, colors } from '../styles/styles';

export default function ScannerView({
  state,
  actions,
}) {

  /* =====================================================
     PERMISO DESCONOCIDO
  ===================================================== */

  if (!state.permission) {

    return (
      <View style={{ flex: 1 }} />
    );

  }


  /* =====================================================
     PERMISO DENEGADO
  ===================================================== */

  if (!state.permission.granted) {

    return (

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >

        <Text>
          Necesitamos permiso para usar la cámara
        </Text>


        <TouchableOpacity
          style={[
            styles.customButton,
            {
              marginTop: 40,
            },
          ]}
          onPress={actions.requestPermission}
        >

          <Text style={styles.buttonText}>
            Dar permiso
          </Text>

        </TouchableOpacity>

      </View>

    );

  }


  /* =====================================================
     CÁMARA
  ===================================================== */

  return (

    <View style={{ flex: 1 }}>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        enableTorch={state.flashActivo}
        onBarcodeScanned={actions.handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code93', 'codabar', 'itf14', 'pdf417', 'aztec', 'datamatrix'],
        }}
      />


      {/* =================================================
          OVERLAY
      ================================================= */}

      <View style={styles.overlay}>


        {/* ---------- VOLVER ---------- */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={actions.volver}
        >

          <Text style={styles.backButtonText}>
            ← Volver
          </Text>

        </TouchableOpacity>


        {/* ---------- FLASH ---------- */}

        {state.soportaFlash && (

          <TouchableOpacity
            style={[
              styles.torchButton,
              state.flashActivo &&
                styles.torchButtonActivo,
            ]}
            onPress={actions.toggleFlash}
            accessibilityRole="button"
            accessibilityLabel={
              state.flashActivo
                ? 'Apagar el flash'
                : 'Encender el flash'
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="btn-flash"
          >

            <MaterialIcons
              name={
                state.flashActivo
                  ? 'flash-on'
                  : 'flash-off'
              }
              size={26}
              color={
                state.flashActivo
                  ? colors.warning
                  : colors.text
              }
            />

          </TouchableOpacity>

        )}


        {/* ---------- MARCO ---------- */}

        <View
          testID="scan-frame"
          onLayout={actions.onFrameLayout}
          style={[
            styles.scanFrame,
            state.tipo === 'ubicacion' && styles.scanFrameSquare,
          ]}
        />


        {/* ---------- TEXTO ---------- */}

        <Text style={styles.hintText}>
          {state.hintText}
        </Text>


      </View>

    </View>

  );

}
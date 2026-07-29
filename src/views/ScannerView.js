import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { CameraView } from 'expo-camera';

import { styles } from '../styles/styles';

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


        {/* ---------- MARCO ---------- */}

        <View style={styles.scanFrame} />


        {/* ---------- TEXTO ---------- */}

        <Text style={styles.hintText}>
          {state.hintText}
        </Text>


      </View>

    </View>

  );

}
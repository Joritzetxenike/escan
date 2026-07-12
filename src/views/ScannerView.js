import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { styles } from '../styles/styles';

export default function ScannerView({
    state,
    actions,
}) {

    if (!state.permission) {
        return <View />;
    }

    if (!state.permission.granted) {

        return (
            <View
                style={{
                    flex:1,
                    justifyContent:'center',
                    alignItems:'center'
                }}
            >

                <Text>
                    Necesitamos permiso para usar la cámara
                </Text>

                <TouchableOpacity
                    style={[
                        styles.customButton,
                        {marginTop:40}
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

    return (

        <View style={{flex:1}}>

            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={actions.handleBarcodeScanned}
            />

            <View style={styles.overlay}>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={actions.volver}
                >
                    <Text style={styles.backButtonText}>
                        ← Volver
                    </Text>
                </TouchableOpacity>

                <View style={styles.scanFrame}/>

                <Text style={styles.hintText}>
                    {state.hintText}
                </Text>

            </View>

        </View>

    );

}
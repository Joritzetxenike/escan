import { Modal, View, Text, TouchableOpacity } from 'react-native';

import { styles } from '../styles/styles';

/* =====================================================
 * MODAL DE ARTÍCULO YA CONTADO
 * =====================================================
 *
 * Sustituye al `Alert.alert` de tres botones que se usaba
 * antes: el Alert nativo no deja maquetar los botones y los
 * apila sin control. Aquí el operario ve la cantidad que ya
 * había y elige entre sumar la nueva, reemplazarla o
 * cancelar, con las dos acciones arriba y el cancelar debajo.
 */

export default function ArticuloExistenteModal({
  visible,
  articulo,
  ubicacion,
  cantidad,
  onSumar,
  onSobrescribir,
  onCancelar,
}) {

  return (

    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >

      <View style={styles.modalOverlay}>

        <View style={styles.modalBox}>

          <Text style={styles.modalTitulo}>
            Artículo ya contado
          </Text>

          <Text style={styles.modalMensaje}>
            {`El artículo ${articulo} ya está en la ubicación ${ubicacion} con cantidad ${cantidad}. ¿Qué quieres hacer?`}
          </Text>

          {/* ---------- ACCIONES ---------- */}

          <View style={styles.modalAccionesVertical}>

            <View style={styles.modalFilaBotones}>

              <TouchableOpacity
                style={[
                  styles.customButton,
                  styles.modalBotonEnFila,
                ]}
                testID="btn-sumar"
                onPress={onSumar}
              >

                <Text
                  style={styles.buttonText}
                  numberOfLines={1}
                >
                  Sumar
                </Text>

              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.customButton,
                  styles.modalBotonEnFila,
                  styles.modalBotonTerciario,
                ]}
                testID="btn-sobrescribir"
                onPress={onSobrescribir}
              >

                <Text
                  style={styles.modalTextoPrimario}
                  numberOfLines={1}
                >
                  Sobrescribir
                </Text>

              </TouchableOpacity>

            </View>

            <TouchableOpacity
              style={[
                styles.customButton,
                styles.modalBotonCancelar,
              ]}
              testID="btn-cancelar-existente"
              onPress={onCancelar}
            >

              <Text style={styles.modalTextoSecundario}>
                Cancelar
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </View>

    </Modal>

  );

}

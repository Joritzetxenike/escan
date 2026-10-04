import { Modal, View, Text, TouchableOpacity } from 'react-native';

import { styles } from '../styles/styles';

/* =====================================================
 * ESQUELETO COMPARTIDO DE LOS MODALES DE FORMULARIO
 * =====================================================
 *
 * Antes cada modal repetía el `Modal`, la caja, el título
 * y la fila de botones, y cada copia se iba pareciendo
 * menos a la anterior: uno ponía los botones en fila y
 * otro apilados, uno estilaba el texto de "Cancelar" y el
 * otro lo dejaba en negro sobre gris. Aquí vive una sola
 * versión, así que todos los modales se ven igual por
 * construcción.
 *
 * `children` es el cuerpo del formulario (los `TextInput` y
 * los rótulos de contexto que necesite cada uno).
 */

export default function ModalFormulario({
  visible,
  titulo,
  onConfirm,
  onCancel,
  textoConfirmar = 'Confirmar',
  children,
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
            {titulo}
          </Text>

          {children}

          {/* ---------- ACCIONES ---------- */}

          <View style={styles.modalAcciones}>

            <TouchableOpacity
              style={[
                styles.customButton,
                styles.modalBotonPrimario,
              ]}
              onPress={onConfirm}
            >

              <Text style={styles.buttonText}>
                {textoConfirmar}
              </Text>

            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.customButton,
                styles.modalBotonSecundario,
              ]}
              onPress={onCancel}
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
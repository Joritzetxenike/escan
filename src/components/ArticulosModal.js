import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ArticulosModal({
  visible,
  titulo,
  articulos,
  onCerrar,
  editandoIndex,
  editandoValor,
  onIniciarEdicion,
  onChangeValor,
  onGuardarEdicion,
  onEliminar,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{titulo}</Text>

          {articulos.length === 0 ? (
            <Text style={styles.empty}>No hay artículos en esta ubicación</Text>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Artículo</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Descripción</Text>
                <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>Cantidad</Text>
                <Text style={[styles.headerCell, { flex: 0.6, textAlign: 'center' }]}>Eliminar</Text>
              </View>

              <ScrollView style={styles.list}>
                {articulos.map((item, index) => (
                  <View key={index} style={styles.row}>
                    <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                      {item.articulo}
                    </Text>
                    <Text style={[styles.cell, { flex: 1, textAlign: 'center', color: '#666', fontSize: 12 }]} numberOfLines={1}>
                      {item.dsca || '—'}
                    </Text>

                    {editandoIndex === index ? (
                      <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={editandoValor}
                          onChangeText={onChangeValor}
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => onGuardarEdicion(index)} style={{ marginLeft: 4 }}>
                          <Text style={{ color: '#007BFF', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => onIniciarEdicion?.(index)}
                        style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: onIniciarEdicion ? '#007BFF' : '#333' }}>
                          {item.cantidad ?? 0}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => onEliminar?.(index)}
                      style={[styles.cell, { flex: 0.6, alignItems: 'center' }]}
                    >
                      <MaterialIcons name="delete-outline" size={26} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onCerrar}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    paddingHorizontal: 5,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  list: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 5,
  },
  cell: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#007BFF',
    borderRadius: 4,
    padding: 2,
    width: 45,
    textAlign: 'center',
    fontSize: 13,
  },
  closeButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

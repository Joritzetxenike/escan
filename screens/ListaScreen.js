import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { styles } from '../styles';

export default function ListaScreen() {
  const [csvs, setCsvs] = useState([]);
  const [csvSeleccionado, setCsvSeleccionado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  /* ---------- CARGAR CSV ---------- */
  const cargarCsvs = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      setCsvs(files.filter((f) => f.endsWith('.csv')));
    } catch (e) {
      console.error('Error leyendo CSVs', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      cargarCsvs();
    }, [])
  );

  /* ---------- EXPORTAR CSV ---------- */
  const exportarCsv = async (nombre) => {
    const uri = FileSystem.documentDirectory + nombre;
    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: `Exportar ${nombre}`,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar el CSV');
      console.error(e);
    }
  };

  /* ---------- BORRAR CSV ---------- */
  const borrarCsv = (nombre) => {
    Alert.alert('Borrar CSV', `¿Eliminar ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(FileSystem.documentDirectory + nombre);
          setCsvSeleccionado(null);
          setRegistros([]);
          setModalVisible(false);
          cargarCsvs();
        },
      },
    ]);
  };

  /* ---------- ABRIR CSV ---------- */
  const abrirCsv = async (nombre) => {
    try {
      const uri = FileSystem.documentDirectory + nombre;
      const contenido = await FileSystem.readAsStringAsync(uri);
      const filas = contenido
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const [ubicacion, articulo, cantidad] = line.split(',');
          return { ubicacion, articulo, cantidad };
        });
      setCsvSeleccionado(nombre);
      setRegistros(filas);
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el CSV');
      console.error(e);
    }
  };

  /* ---------- BORRAR REGISTRO INDIVIDUAL ---------- */
  const borrarRegistro = (index) => {
    Alert.alert('Borrar registro', '¿Eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const nuevos = [...registros];
          nuevos.splice(index, 1);
          setRegistros(nuevos);

          // Guardar cambios en el CSV
          const csvString = nuevos.map(r => `${r.ubicacion},${r.articulo},${r.cantidad}`).join('\n');
          await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + csvSeleccionado, csvString);
        },
      },
    ]);
  };

  /* ---------- RENDER ITEM CSV ---------- */
  const renderItemCsv = ({ item }) => (
    <View style={stylesCsv.rowCsv}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirCsv(item)}>
        <Text style={{ fontSize: 18 }}>{item}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => exportarCsv(item)} style={{ marginHorizontal: 10 }}>
        <MaterialIcons name="file-upload" size={26} color="#1976D2" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => borrarCsv(item)}>
        <MaterialIcons name="delete-outline" size={26} color="#C62828" />
      </TouchableOpacity>
    </View>
  );

  /* ---------- RENDER ITEM REGISTRO ---------- */
  const renderRegistro = ({ item, index }) => (
    <View style={stylesCsv.rowRegistro}>
      <Text style={{ flex: 2 }}>{item.ubicacion}</Text>
      <Text style={{ flex: 3 }}>{item.articulo}</Text>
      <Text style={{ flex: 1, textAlign: 'center' }}>{item.cantidad}</Text>
      <TouchableOpacity onPress={() => borrarRegistro(index)} style={{ flex: 0.5, alignItems: 'center' }}>
        <MaterialIcons name="delete-outline" size={22} color="#C62828" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { flex: 1, padding: 10 }]}>
      <Text style={[styles.headerTitle, { fontSize: 26, marginBottom: 20 }]}>
        Archivos CSV
      </Text>

      {csvs.length === 0 ? (
        <Text style={{ fontSize: 16, color: '#666' }}>No hay archivos CSV</Text>
      ) : (
        <FlatList
          data={csvs}
          keyExtractor={(item) => item}
          renderItem={renderItemCsv}
        />
      )}

      {/* ---------- MODAL DE REGISTROS ---------- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={stylesCsv.modalBackground}>
          <View style={stylesCsv.modalContainer}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
              Contenido: {csvSeleccionado}
            </Text>

            {/* Cabecera */}
            <View style={stylesCsv.rowRegistro}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Ubicación</Text>
              <Text style={{ flex: 3, fontWeight: 'bold' }}>Artículo</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Cantidad</Text>
              <Text style={{ flex: 0.5 }}></Text>
            </View>

            <FlatList
              data={registros}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderRegistro}
              style={{ maxHeight: '80%' }}
            />

            <TouchableOpacity
              style={[stylesCsv.customButton, { marginTop: 10 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={stylesCsv.buttonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesCsv = StyleSheet.create({
  rowCsv: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  rowRegistro: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    maxHeight: '90%',
  },
  customButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

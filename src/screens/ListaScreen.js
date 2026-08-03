import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { styles, colors } from '../styles/styles';
import ArticulosModal from '../components/ArticulosModal';

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
        <MaterialIcons name="file-upload" size={26} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => borrarCsv(item)}>
        <MaterialIcons name="delete-outline" size={26} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { flex: 1, padding: 10 }]}>
      {csvs.length === 0 ? (
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>No hay archivos CSV</Text>
      ) : (
        <FlatList
          data={csvs}
          keyExtractor={(item) => item}
          renderItem={renderItemCsv}
        />
      )}

      <ArticulosModal
        visible={modalVisible}
        titulo={csvSeleccionado}
        articulos={registros}
        onCerrar={() => setModalVisible(false)}
        onEliminar={borrarRegistro}
      />
    </View>
  );
}

const stylesCsv = StyleSheet.create({
  rowCsv: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

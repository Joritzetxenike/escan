import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { guardarRegistro, leerCsvUbicacion } from '../helpers/csvHelper';
//import * as Haptics from 'expo-haptics';

export function useHomeLogic(setCamaraAbierta) {
  const [modoScanner, setModoScanner] = useState(null);

  const [ubicacion, setUbicacion] = useState(null);
  const [articuloTemp, setArticuloTemp] = useState(null);

  const [mostrarCantidad, setMostrarCantidad] = useState(false);
  const [ultimosArticulos, setUltimosArticulos] = useState([]);

  const [cacheUbicacion, setCacheUbicacion] = useState([]);
  const [escaneadosSesion, setEscaneadosSesion] = useState([]);

  const [mostrarManual, setMostrarManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState(''); 

  /* ---------- CAMARA ---------- */
  useEffect(() => {
    setCamaraAbierta(modoScanner !== null);
  }, [modoScanner]);

  /* ---------- CONTROL SCANNER ---------- */
  const iniciarScanner = (tipo) => setModoScanner(tipo);
  const cerrarScanner = () => setModoScanner(null);

  /* ---------- MOTOR CENTRAL (IMPORTANTE) ---------- */
 const procesarCodigo = async (data, origen = 'scanner') => {
  try {

    /* ---------- UBICACIÓN ---------- */
    if (modoScanner === 'ubicacion' || origen === 'ubicacion') {
      setUbicacion(data);
      setModoScanner(null);

      const registros = await leerCsvUbicacion(data);
      setCacheUbicacion(registros);

      setEscaneadosSesion([]);

      return;
    }

    /* ---------- ARTÍCULO ---------- */
    if (modoScanner === 'articulo' || origen === 'articulo' || origen === 'manual') {

      if (!ubicacion) {
        Alert.alert('Error', 'Primero escanea una ubicación');
        setModoScanner(null);
        return;
      }


      // ❌ duplicado
      if (escaneadosSesion.includes(data)) {
        Alert.alert(
          'Artículo duplicado',
          `El artículo ${data} ya ha sido escaneado en la ubicación ${ubicacion}`
        );

        setModoScanner(null);
        return;
      }

      // ✅ válido
      setArticuloTemp(data);
      setEscaneadosSesion(prev => [...prev, data]);

      setModoScanner(null);
      setMostrarCantidad(true);
    }

  } catch (e) {
    console.error(e);
    Alert.alert('Error', 'Error procesando código');
  }
};

  /* ---------- SCANNER ---------- */
  const onCodeScanned = (data) => {
    procesarCodigo(data, 'scanner');
  };

  /* ---------- MANUAL INPUT ---------- */
  const onManualCode = (codigo) => {
    procesarCodigo(codigo, 'manual');
  };

  /* ---------- GUARDAR ---------- */
  const confirmarCantidad = async (cantidad) => {
    const nuevoRegistro = {
      ubicacion,
      articulo: articuloTemp,
      cantidad,
    };

    try {
      await guardarRegistro(nuevoRegistro);

      setUltimosArticulos(prev =>
        [nuevoRegistro, ...prev].slice(0, 5)
      );

    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el registro');
    }

    setArticuloTemp(null);
    setMostrarCantidad(false);
  };

  /* ---------- RETURN ---------- */
  return {
    modoScanner,
    ubicacion,
    articuloTemp,
    mostrarCantidad,
    ultimosArticulos,

    iniciarScanner,
    cerrarScanner,

    onCodeScanned,
    onManualCode,

    confirmarCantidad,
    setMostrarCantidad,

    mostrarManual,
    setMostrarManual,
    codigoManual,
    setCodigoManual,
  };
}
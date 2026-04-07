import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { guardarRegistro } from '../helpers/csvHelper';

export function useHomeLogic(setCamaraAbierta) {
  const [modoScanner, setModoScanner] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [articuloTemp, setArticuloTemp] = useState(null);
  const [mostrarCantidad, setMostrarCantidad] = useState(false);
  const [ultimosArticulos, setUltimosArticulos] = useState([]);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');   

  useEffect(() => {
    setCamaraAbierta(modoScanner !== null);
  }, [modoScanner]);

  const iniciarScanner = (tipo) => setModoScanner(tipo);

  const cerrarScanner = () => setModoScanner(null);

  const onCodeScanned = (data) => {
    if (modoScanner === 'ubicacion') {
      setUbicacion(data);
      setModoScanner(null);
    }

    if (modoScanner === 'articulo') {
      if (!ubicacion) {
        Alert.alert('Error', 'Primero escanea una ubicación');
        setModoScanner(null);
        return;
      }
      setArticuloTemp(data);
      setModoScanner(null);
      setMostrarCantidad(true);
    }
  };

  const confirmarCantidad = async (cantidad) => {
    const nuevoRegistro = { ubicacion, articulo: articuloTemp, cantidad };

    try {
      await guardarRegistro(nuevoRegistro);
      setUltimosArticulos(prev => [nuevoRegistro, ...prev].slice(0, 5));
    } catch {
      Alert.alert('Error', 'No se pudo guardar el registro');
    }

    setArticuloTemp(null);
    setMostrarCantidad(false);
  };

  const onManualCode = (codigo) => {
    setArticuloTemp(codigo);
    setMostrarCantidad(true);
    };

  return {
    modoScanner,
    ubicacion,
    articuloTemp,
    mostrarCantidad,
    ultimosArticulos,
    iniciarScanner,
    cerrarScanner,
    onCodeScanned,
    confirmarCantidad,
    setMostrarCantidad,
    mostrarManual,
    codigoManual,
    setMostrarManual,
    setCodigoManual,
    onManualCode,
  };
}
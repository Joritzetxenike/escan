import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

import InventoryService from '../services/InventoryService';

export function useHomeLogic(setCamaraAbierta) {
  const [modoScanner, setModoScanner] = useState(null);

  const [ubicacion, setUbicacion] = useState(null);
  const [articuloTemp, setArticuloTemp] = useState(null);

  const [mostrarCantidad, setMostrarCantidad] = useState(false);
  const [ultimosArticulos, setUltimosArticulos] = useState([]);

  //const [cacheUbicacion, setCacheUbicacion] = useState([]);
  const [escaneadosSesion, setEscaneadosSesion] = useState([]);

  const [mostrarManual, setMostrarManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState(''); 

  /* ---------- CAMARA ---------- */
  useEffect(() => {
    setCamaraAbierta(modoScanner !== null);
  }, [modoScanner]);

  /* ---------- CONTROL SCANNER ---------- */
  const abrirScanner = (tipo) => {
    setModoScanner(tipo);
  };

  const cerrarScanner = () => {
      setModoScanner(null);
  };

  const procesarArticulo = (codigo) => {

    const resultado = InventoryService.validarArticulo(
      codigo,
      ubicacion,
      escaneadosSesion
    );

    if (!resultado.ok) {
      Alert.alert(resultado.titulo, resultado.mensaje);
      return;
    }

    setArticuloTemp(codigo);

    setEscaneadosSesion(prev => [...prev, codigo]);

    setMostrarCantidad(true);
  };
  const cargarUbicacion = async (codigo) => {
    setUbicacion(codigo);

    const articulos = await InventoryService.cargarUbicacion(codigo);

    setEscaneadosSesion([]);

    return articulos;
  };
    /* ---------- MOTOR CENTRAL (IMPORTANTE) ---------- */
  const procesarCodigo = async (codigo, origen = 'scanner') => {

  try {

    if (modoScanner === 'ubicacion' || origen === 'ubicacion') {
      await cargarUbicacion(codigo);
      cerrarScanner();
      return;
    }   

    if (
      modoScanner === 'articulo' ||
      origen === 'articulo' ||
      origen === 'manual'
    ) {
      procesarArticulo(codigo);
      cerrarScanner();
      return;
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
  const limpiarArticulo = () => {

      setArticuloTemp(null);

      setCodigoManual('');

      setMostrarManual(false);

      setMostrarCantidad(false);
  };

const confirmarCantidad = async (cantidad) => {

  try {

    const movimiento = InventoryService.crearMovimiento(
      ubicacion,
      articuloTemp,
      cantidad
    );

    await InventoryService.guardarMovimiento(movimiento);

    setUltimosArticulos(prev =>
      [movimiento, ...prev].slice(0, 5)
    );

    limpiarArticulo();

  } catch (e) {
    console.error(e);
    Alert.alert('Error', 'No se pudo guardar el registro');
  }
};


  /* ---------- RETURN ---------- */
  return {
    modoScanner,
    ubicacion,
    articuloTemp,
    mostrarCantidad,
    ultimosArticulos,

    abrirScanner,
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
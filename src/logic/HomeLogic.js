import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import InventoryService from '../services/InventoryService';
import useConectividad from './useConectividad';

export function useHomeLogic(navigation) {

  /* =====================================================
   * ESTADO
   * ===================================================== */

  const [ubicacion, setUbicacion] = useState(null);

  const [ubicacionFinalizada, setUbicacionFinalizada] =
    useState(false);

/* ---------- Sin conexión ---------- */

  /* La ubicación se escaneó sin poder validarla contra el
     maestro: se comprueba al sincronizar */

  const [ubicacionSinValidar, setUbicacionSinValidar] =
    useState(false);

  /* El artículo se aceptó sin poder validarlo contra
     el maestro: se comprueba al sincronizar */

  const [articuloSinValidar, setArticuloSinValidar] =
    useState(false);

  const [articuloTemp, setArticuloTemp] = useState(null);

  const [mostrarCantidad, setMostrarCantidad] = useState(false);

  const [ultimosArticulos, setUltimosArticulos] = useState([]);

  /* Cantidad ya contada de `articuloTemp` en la ubicación,
     leída del CSV al validarlo; `null` si es nuevo. */

  const [cantidadExistente, setCantidadExistente] =
    useState(null);

  /* Cómo se guarda la próxima cantidad: `normal` (artículo
     nuevo), `sumar` (existente + tecleado) o `sobrescribir`
     (lo tecleado reemplaza lo que había). */

  const [modoGuardar, setModoGuardar] = useState('normal');

  /* Modal propio que pregunta qué hacer con un artículo que ya
     estaba contado: sumar, sobrescribir o cancelar. */

  const [mostrarExistente, setMostrarExistente] = useState(false);

  const [mostrarManual, setMostrarManual] = useState(false);

  const [codigoManual, setCodigoManual] = useState('');

  const [mostrarManualUbicacion, setMostrarManualUbicacion] =
    useState(false);

  const conectividad = useConectividad();


  /* =====================================================
   * NAVEGACIÓN AL SCANNER
   * ===================================================== */

  const abrirScannerUbicacion = () => {

    navigation.navigate('Scanner', {

      tipo: 'ubicacion',

      onScan: ({ codigo }) => {
        procesarEscaneo('ubicacion', codigo);
      },

    });

  };


  const avisoSinUbicacion = () => {

    Alert.alert(
      'Error',
      'Primero escanea una ubicación'
    );

  };


  /* Se avisa al intentar meter un artículo, no después de
     escanearlo/teclearlo: la ubicación terminada no admite
     más artículos, así que no tiene sentido abrir la cámara ni
     el modal para luego rechazarlo. */
  const avisoUbicacionTerminada = () => {

    Alert.alert(
      'Ubicación terminada',
      `La ubicación ${ubicacion} está terminada y no admite más artículos`
    );

  };


  const abrirScannerArticulo = () => {

    if (!ubicacion) {
      avisoSinUbicacion();
      return;
    }

    if (ubicacionFinalizada) {
      avisoUbicacionTerminada();
      return;
    }

    navigation.navigate('Scanner', {

      tipo: 'articulo',

      onScan: ({ codigo }) => {
        procesarEscaneo('articulo', codigo);
      },

    });

  };


  /* =====================================================
 * ENTRADA MANUAL
 * =====================================================
 *
 * Antes esto estaba bloqueado sin conexión porque el código se
 * validaba contra el maestro, que solo era accesible en red.
 * Con la copia local del maestro ya no hace falta: la
 * validación es local y si no hay copia sale el aviso de
 * "Sin copia de maestros", que es lo mismo que ve el operario
 * al escanear.
 * ===================================================== */

  const abrirModalManual = () => {

    if (!ubicacion) {
      avisoSinUbicacion();
      return;
    }

    if (ubicacionFinalizada) {
      avisoUbicacionTerminada();
      return;
    }

    setMostrarManual(true);

  };


  const abrirModalManualUbicacion = () => {

    /* No se exige ubicación previa: la ubicación es
       precisamente lo que se está introduciendo. */

    setMostrarManualUbicacion(true);

  };


  /* =====================================================
   * UBICACIÓN
   * =====================================================
   *
   * La normalización vive aquí y no en el modal porque este es
   * el único punto por el que pasan tanto el escáner como la
   * entrada manual: así no puede quedar en el estado una
   * ubicación en minúsculas y otra en mayúsculas. Sobre el
   * escaneo es un no-op, las etiquetas ya vienen en mayúsculas.
   */

  const normalizarUbicacion = (codigo) =>
    String(codigo ?? '').trim().toUpperCase();

  const cargarUbicacion = async (codigo) => {

    const codigoNormalizado =
      normalizarUbicacion(codigo);

    try {

      const resultado =
        await InventoryService.validarUbicacion(
          codigoNormalizado
        );

      if (!resultado.ok) {

        Alert.alert(
          resultado.titulo,
          resultado.mensaje
        );

        return false;
      }

      setUbicacion(codigoNormalizado);

      setUbicacionFinalizada(
        resultado.ubicacion?.stat === 'Fin'
      );

      setUbicacionSinValidar(
        resultado.ubicacionProvisional === true
      );

      await InventoryService.cargarUbicacion(
        codigoNormalizado
      );

      return true;

    } catch (e) {

      console.error(
        'Error cargando ubicación:',
        e
      );

      throw e;
    }

  };


  /* =====================================================
   * ARTÍCULO
   * ===================================================== */
/**
   * Devuelve `false` solo cuando el código tecleado no es
   * válido y hay que corregirlo, para que el modal pueda
   * quedarse abierto con el texto puesto. En el resto de
   * casos devuelve `true`, incluso con la ubicación cerrada:
   * ahí no hay nada que corregir en lo tecleado y el modal
   * debe cerrarse.
   */
  const procesarArticulo = async (codigo) => {

    /* ---------- UBICACIÓN TERMINADA ---------- */

    if (ubicacionFinalizada) {

      avisoUbicacionTerminada();

      return true;
    }

    const resultado =
      await InventoryService.validarArticulo(
        codigo,
        ubicacion
      );


    /* ---------- ARTÍCULO NO VÁLIDO ---------- */

    if (!resultado.ok) {

      Alert.alert(
        resultado.titulo,
        resultado.mensaje
      );

      return false;
    }


    /* ---------- AVISO SIC ---------- */

    if (resultado.esSIC) {

      Alert.alert(
        'Artículo SIC',
        `El código ${codigo} es un SIC. Asegúrate de que sea el artículo correcto antes de continuar.`
      );

    }


    /* ---------- ARTÍCULO VÁLIDO ---------- */

    setArticuloSinValidar(
      resultado.provisional === true
    );

    setArticuloTemp(codigo);


    /* ---------- ¿YA CONTADO EN EL CSV? ---------- */

    /* La verdad de lo contado es el CSV de la ubicación. Si el
       artículo ya está, no se puede dar por nuevo: se avisa y
       se deja elegir entre sumar la cantidad nueva, reemplazar
       la que había o cancelar. */

    const existente =
      await InventoryService.obtenerCantidadGuardada(
        ubicacion,
        codigo
      );

    if (existente != null) {

      setCantidadExistente(existente);

      /* En vez de un Alert nativo que no se puede maquetar, se
         abre el modal propio. La elección (sumar/sobrescribir/
         cancelar) la resuelven `elegirSumar`, `elegirSobrescribir`
         y `cancelarExistente`. */

      setMostrarExistente(true);

      return true;

    }


    setModoGuardar('normal');

    setMostrarCantidad(true);

    return true;

  };


  /* =====================================================
   * PROCESAR RESULTADO DEL SCANNER
   * ===================================================== */

  const procesarEscaneo = async (
    tipo,
    codigo
  ) => {

    try {

      console.log(
        'Procesando escaneo:',
        tipo,
        codigo
      );
/* ---------- UBICACIÓN ---------- */

      if (tipo === 'ubicacion') {

        return await cargarUbicacion(codigo);

      }


      /* ---------- ARTÍCULO ---------- */

      if (tipo === 'articulo') {

        return await procesarArticulo(codigo);

      }


      /* ---------- TIPO DESCONOCIDO ---------- */

      console.warn(
        'Tipo de escaneo desconocido:',
        tipo
      );

      return false;

    } catch (e) {

      console.error(e);

      Alert.alert(
        'Error',
        'Error procesando el código'
      );

      return false;

    }

  };


  /* =====================================================
   * REVALIDAR UBICACIÓN AL VOLVER A HOME
   * ===================================================== */

  useFocusEffect(
    useCallback(() => {

      if (!ubicacion) return;

      let activo = true;

      (async () => {
        try {
          const finalizada =
            await InventoryService.estaUbicacionFinalizada(
              ubicacion
            );

          if (activo) {
            setUbicacionFinalizada(finalizada);
          }
        } catch (e) {
          console.error(
            'Error revalidando ubicación:',
            e
          );
        }
      })();

      return () => {
        activo = false;
      };

    }, [ubicacion])
  );


  /* =====================================================
   * CÓDIGO MANUAL
   * ===================================================== */

  /**
   * Devuelve `true` si el artículo se ha aceptado, para que el
   * modal pueda cerrarse. Si el código no existe devuelve
   * `false` y el modal se queda abierto con el texto puesto:
   * un artículo tecleado a mano se equivoca fácil.
   */
  const onManualCode = (codigo) =>
    procesarEscaneo('articulo', codigo);


  /**
   * Sugerencias de la copia local para la entrada manual de
   * artículos. Referencia estable para que el `useEffect` del
   * modal no se dispare en cada render.
   */
  const sugerirArticulos = useCallback(
    (texto) => InventoryService.sugerirArticulos(texto),
    []
  );


  /**
   * Devuelve `true` si la ubicación es válida, para que el
   * modal pueda seguir abierto cuando el código tecleado no
   * existe: con tres partes es fácil equivocarse y obligar a
   * volver a pulsarlo sería un fastidio.
   */
  const onManualUbicacion = (codigo) =>
    procesarEscaneo('ubicacion', codigo);


  /* =====================================================
   * LIMPIAR ARTÍCULO
   * ===================================================== */

  const limpiarArticulo = () => {

    setArticuloTemp(null);

    setArticuloSinValidar(false);

    setCantidadExistente(null);

    setModoGuardar('normal');

    setMostrarExistente(false);

    setCodigoManual('');

    setMostrarManual(false);

    setMostrarCantidad(false);

  };


  /* =====================================================
   * DESCARTAR ARTÍCULO
   * =====================================================
   *
   * Al cancelar el modal de cantidad no se toca el CSV (aún
   * no se ha guardado nada), así que basta con limpiar el
   * artículo en curso. Si ya estaba contado, la próxima
   * lectura vuelve a leer su cantidad del CSV.
   */

  const descartarArticulo = () => {

    limpiarArticulo();

  };


  /* =====================================================
   * ARTÍCULO YA CONTADO
   * =====================================================
   *
   * Acciones del modal propio. Sumar y sobrescribir solo
   * fijan `modoGuardar` y abren el modal de cantidad; la
   * cantidad final la calcula `confirmarCantidad`. Cancelar
   * descarta el artículo en curso sin tocar el CSV.
   */

  const elegirSumar = () => {

    setModoGuardar('sumar');

    setMostrarExistente(false);

    setMostrarCantidad(true);

  };


  const elegirSobrescribir = () => {

    setModoGuardar('sobrescribir');

    setMostrarExistente(false);

    setMostrarCantidad(true);

  };


  const cancelarExistente = () => {

    limpiarArticulo();

  };


  /* =====================================================
   * CONFIRMAR CANTIDAD
   * ===================================================== */

  const confirmarCantidad = async (
    cantidad
  ) => {

    try {

      /* Al sumar, lo tecleado se añade a lo que ya había en el
         CSV; en cualquier otro caso, es la cantidad a guardar. */

      const cantidadFinal =
        modoGuardar === 'sumar' &&
        cantidadExistente != null
          ? cantidadExistente + cantidad
          : cantidad;

      const movimiento =
InventoryService.crearMovimiento(
          ubicacion,
          articuloTemp,
          cantidadFinal
        );


      const resultado =
        await InventoryService.guardarMovimiento(
          movimiento,
          {
            provisionalArticulo: articuloSinValidar,
            ubicacionProvisional: ubicacionSinValidar,
          }
        );


      /* ---------- ACTUALIZAR ÚLTIMOS ---------- */

      setUltimosArticulos(
        prev => [
          {
            ...movimiento,
            pendiente: resultado?.pendiente === true,
          },
          ...prev,
        ].slice(0, 5)
      );


      /* ---------- LIMPIAR ---------- */

      limpiarArticulo();

    } catch (e) {

      console.error(e);

      Alert.alert(
        'Error',
        'No se pudo guardar el registro'
      );

    }

  };


  /* =====================================================
   * RETURN
   * ===================================================== */

  return {

    /* ---------- ESTADO ---------- */

    ubicacion,

    ubicacionFinalizada,

    ubicacionSinValidar,

    articuloTemp,

    articuloSinValidar,

    mostrarCantidad,

    ultimosArticulos,


    /* ---------- CONECTIVIDAD ---------- */

    conectividad,


    /* ---------- SCANNER ---------- */

    abrirScannerUbicacion,

    abrirScannerArticulo,


    /* ---------- PROCESAMIENTO ---------- */

    procesarEscaneo,

    onManualCode,

    sugerirArticulos,

    onManualUbicacion,


    /* ---------- CANTIDAD ---------- */

    confirmarCantidad,

    descartarArticulo,

    setMostrarCantidad,


    /* ---------- ARTÍCULO YA CONTADO ---------- */

    mostrarExistente,

    cantidadExistente,

    elegirSumar,

    elegirSobrescribir,

    cancelarExistente,


    /* ---------- MODAL MANUAL ---------- */

    mostrarManual,

    abrirModalManual,

    setMostrarManual,

    codigoManual,

    setCodigoManual,


    /* ---------- MODAL MANUAL DE UBICACIÓN ---------- */

    mostrarManualUbicacion,

    abrirModalManualUbicacion,

    setMostrarManualUbicacion,

  };

}
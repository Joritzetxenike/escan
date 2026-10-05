import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import {
  obtenerSecciones,
  obtenerAreas,
  obtenerUbicacionesDeArea,
  obtenerEstadoUbicaciones,
} from "../services/ubicacionesService";
import { resumirEstados } from "../helpers/estadosResumenHelper";
import InventoryService from "../services/InventoryService";
import ArticulosModal from "../components/ArticulosModal";
import EstadoResumen, {
  COLORES_ESTADO,
} from "../components/EstadoResumen";
import { colors } from "../styles/styles";

/* La pantalla ofrece las dos vistas y entra por el resumen:
   es lo que se quiere ver al llegar. La lista queda a un
   toque y se sigue cargando bajo demanda, porque son
   peticiones por niveles sobre 18 secciones. */

const VISTAS = [
  { clave: "resumen", etiqueta: "Resumen" },
  { clave: "lista", etiqueta: "Lista" },
];

export default function EstadoScreen({ navigation }) {

  const [vista, setVista] = useState("resumen");

  // Resumen
  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState(false);

  // Lista
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Secciones abiertas
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});

  // Áreas por sección: { [seccion]: { cargando, datos } }
  const [areasPorSeccion, setAreasPorSeccion] = useState({});

  // Áreas abiertas
  const [areasAbiertas, setAreasAbiertas] = useState({});

  // Ubicaciones por área: { [seccion-area]: { cargando, datos } }
  const [ubicacionesPorArea, setUbicacionesPorArea] = useState({});

  // Modal de artículos
  const [modalVisible, setModalVisible] = useState(false);
  const [modalUbicacion, setModalUbicacion] = useState(null);
  const [articulosUbicacion, setArticulosUbicacion] = useState([]);
  const [editandoCantidad, setEditandoCantidad] = useState(null);
  const [nuevaCantidad, setNuevaCantidad] = useState("");

  const obtenerColor = (estado) =>
    COLORES_ESTADO[estado] || COLORES_ESTADO.Inicio;

  const cargar = useCallback(async () => {
    try {
      setCargando(true);

      const datos = await obtenerSecciones();

      setSecciones(datos);
      setSeccionesAbiertas({});
      setAreasAbiertas({});
      setAreasPorSeccion({});
      setUbicacionesPorArea({});
      setCargado(true);

    } catch (error) {
      console.error("Error cargando ubicaciones:", error);
      Alert.alert("Error", "No se pudieron cargar las ubicaciones");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      setCargandoResumen(true);
      setErrorResumen(false);

      const arbol = await obtenerEstadoUbicaciones();

      setResumen(resumirEstados(arbol));

    } catch (e) {
      console.error("Error cargando resumen:", e);
      setErrorResumen(true);
    } finally {
      setCargandoResumen(false);
    }
  }, []);

  /* El resumen entra solo: es una consulta y es la vista por
     defecto. La lista no, para no pedir las 18 secciones sin
     que nadie las haya pedido. */

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  /* El ⟳ de la cabecera recarga lo que se está viendo. */

  const recargar = useCallback(() => {
    if (vista === "resumen") {
      cargarResumen();
    } else {
      cargar();
    }
  }, [vista, cargarResumen, cargar]);

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerRight: () => (
        <TouchableOpacity
          onPress={recargar}
          activeOpacity={0.7}
          testID="recargar-estado"
          accessibilityRole="button"
          accessibilityLabel="Recargar"
          style={{
            padding: 8,
            marginRight: 5,
          }}
        >
          <MaterialIcons
            name="refresh"
            size={26}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, recargar]);

  const alternarSeccion = async (seccion) => {
    const abrir = !seccionesAbiertas[seccion];

    setSeccionesAbiertas((actual) => ({
      ...actual,
      [seccion]: abrir,
    }));

    if (abrir && !areasPorSeccion[seccion]) {
      try {
        const areas = await obtenerAreas(seccion);
        setAreasPorSeccion((actual) => ({
          ...actual,
          [seccion]: { cargando: false, datos: areas },
        }));
      } catch (e) {
        console.error(e);
        setAreasPorSeccion((actual) => ({
          ...actual,
          [seccion]: { cargando: false, datos: [] },
        }));
        Alert.alert("Error", "No se pudieron cargar las áreas");
      }
    }
  };

  const alternarArea = async (seccion, area) => {
    const id = `${seccion}-${area}`;
    const abrir = !areasAbiertas[id];

    setAreasAbiertas((actual) => ({
      ...actual,
      [id]: abrir,
    }));

    if (abrir && !ubicacionesPorArea[id]) {
      try {
        const ubicaciones = await obtenerUbicacionesDeArea(seccion, area);
        setUbicacionesPorArea((actual) => ({
          ...actual,
          [id]: { cargando: false, datos: ubicaciones },
        }));
      } catch (e) {
        console.error(e);
        setUbicacionesPorArea((actual) => ({
          ...actual,
          [id]: { cargando: false, datos: [] },
        }));
        Alert.alert("Error", "No se pudieron cargar las ubicaciones");
      }
    }
  };

  const abrirModalUbicacion = async (ubicacionId) => {
    try {
      const articulos = await InventoryService.cargarUbicacion(ubicacionId);
      setModalUbicacion(ubicacionId);
      setArticulosUbicacion(articulos);
      setEditandoCantidad(null);
      setNuevaCantidad("");
      setModalVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudieron cargar los artículos");
    }
  };

  const handleGuardarCantidad = async (index) => {
    const cant = Number(nuevaCantidad);
    if (!Number.isInteger(cant) || cant < 0) {
      Alert.alert("Error", "Introduce una cantidad válida");
      return;
    }

    const articulo = articulosUbicacion[index];
    try {
      await InventoryService.actualizarMovimiento({
        ubicacion: articulo.ubicacion,
        articulo: articulo.articulo,
        cantidad: cant,
      });
      const actualizados = [...articulosUbicacion];
      actualizados[index].cantidad = cant;
      setArticulosUbicacion(actualizados);
      setEditandoCantidad(null);
      setNuevaCantidad("");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo actualizar la cantidad");
    }
  };

  return (
    <View style={{ flex: 1 }}>

      {/* ---------- CONMUTADOR DE VISTA ---------- */}

      <View style={conmutadorEstilo}>
        {VISTAS.map(({ clave, etiqueta }) => (
          <TouchableOpacity
            key={clave}
            onPress={() => setVista(clave)}
            activeOpacity={0.7}
            testID={`vista-${clave}`}
            accessibilityRole="button"
            accessibilityState={{ selected: vista === clave }}
            style={[
              conmutadorBoton,
              vista === clave && conmutadorActivo,
            ]}
          >
            <Text
              style={[
                conmutadorTexto,
                vista === clave && conmutadorTextoActivo,
              ]}
            >
              {etiqueta}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {vista === "resumen" ? (
        <EstadoResumen
          resumen={resumen}
          cargando={cargandoResumen}
          error={errorResumen}
          onReintentar={cargarResumen}
        />
      ) : (
      <>
      {cargando && !cargado ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : !cargado ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableOpacity
            onPress={cargar}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              Cargar ubicaciones
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 30,
        }}
      >

        {secciones.map((seccion) => {

          const seccionAbierta =
            seccionesAbiertas[seccion.seccion];

          const areas =
            areasPorSeccion[seccion.seccion];

          return (
            <View
              key={seccion.seccion}
              style={{
                marginBottom: 10,
              }}
            >

              {/* =========================
                  SECCIÓN
              ========================= */}

              <TouchableOpacity
                onPress={() =>
                  alternarSeccion(seccion.seccion)
                }
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#E8E8E8",
                  padding: 15,
                  borderRadius: 10,
                }}
              >

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >

                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      marginRight: 10,
                    }}
                  >
                    {seccionAbierta ? "▼" : "▶"}
                  </Text>

                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    Sección {seccion.seccion}
                  </Text>

                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >

                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor:
                        obtenerColor(seccion.stat),
                      marginRight: 7,
                    }}
                  />

                  <Text>
                    {seccion.stat}
                  </Text>

                </View>

              </TouchableOpacity>


              {/* =========================
                  ÁREAS
              ========================= */}

              {seccionAbierta && (
                <View
                  style={{
                    marginLeft: 15,
                  }}
                >
                  {areas?.cargando ? (
                    <ActivityIndicator
                      style={{ marginVertical: 8 }}
                    />
                  ) : (
                    (areas?.datos || []).map((area) => {

                      const areaId =
                        `${seccion.seccion}-${area.area}`;

                      const areaAbierta =
                        areasAbiertas[areaId];

                      const ubicaciones =
                        ubicacionesPorArea[areaId];

                      return (
                        <View
                          key={areaId}
                          style={{
                            marginTop: 6,
                          }}
                        >

                          <TouchableOpacity
                            onPress={() =>
                              alternarArea(
                                seccion.seccion,
                                area.area
                              )
                            }
                            activeOpacity={0.7}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: "#F5F5F5",
                              padding: 12,
                              borderRadius: 8,
                            }}
                          >

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                flex: 1,
                              }}
                            >

                              <Text
                                style={{
                                  fontSize: 16,
                                  marginRight: 8,
                                }}
                              >
                                {areaAbierta
                                  ? "▼"
                                  : "▶"}
                              </Text>

                              <Text
                                style={{
                                  fontSize: 17,
                                  fontWeight: "600",
                                }}
                              >
                                Área {area.area}
                              </Text>

                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >

                              <View
                                style={{
                                  width: 13,
                                  height: 13,
                                  borderRadius: 7,
                                  backgroundColor:
                                    obtenerColor(
                                      area.stat
                                    ),
                                  marginRight: 6,
                                }}
                              />

                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "#4B5563",
                                }}
                              >
                                {area.stat}
                              </Text>

                            </View>

                          </TouchableOpacity>


                          {/* =========================
                              UBICACIONES
                          ========================= */}

                          {areaAbierta && (
                            <View>
                              {ubicaciones?.cargando ? (
                                <ActivityIndicator
                                  style={{ marginVertical: 8 }}
                                />
                              ) : (
                                (ubicaciones?.datos || []).map(
                                  (ubicacion) => (

                                    <TouchableOpacity
                                      key={
                                        ubicacion.ubicacion
                                      }
                                      onPress={() =>
                                        abrirModalUbicacion(
                                          ubicacion.ubicacion
                                        )
                                      }
                                      activeOpacity={0.7}
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent:
                                          "space-between",
                                        backgroundColor:
                                          "#FFFFFF",
                                        padding: 12,
                                        marginLeft: 20,
                                        marginTop: 4,
                                        borderRadius: 7,
                                        elevation: 1,
                                      }}
                                    >

                                      <Text
                                        style={{
                                          fontSize: 15,
                                          flex: 1,
                                        }}
                                      >
                                        {
                                          ubicacion.ubicacion
                                        }
                                      </Text>

                                      <View
                                        style={{
                                          flexDirection:
                                            "row",
                                          alignItems:
                                            "center",
                                        }}
                                      >

                                        <View
                                          style={{
                                            width: 13,
                                            height: 13,
                                            borderRadius:
                                              7,
                                            backgroundColor:
                                              obtenerColor(
                                                ubicacion.stat
                                              ),
                                            marginRight: 6,
                                          }}
                                        />

                                        <Text
                                          style={{
                                            fontSize: 12,
                                            color: "#4B5563",
                                          }}
                                        >
                                          {
                                            ubicacion.stat
                                          }
                                        </Text>

                                      </View>

                                    </TouchableOpacity>

                                  )
                                )
                              )}
                            </View>
                          )}

                        </View>
                      );
                    })
                  )}
                </View>
              )}

            </View>
          );
        })}

      </ScrollView>
      )}
      </>

      )}

      <ArticulosModal
        visible={modalVisible}
        titulo={modalUbicacion}
        articulos={articulosUbicacion}
        onCerrar={() => setModalVisible(false)}
        codigoUbicacion={modalUbicacion}
        editandoIndex={editandoCantidad}
        editandoValor={nuevaCantidad}
        onIniciarEdicion={(index) => {
          setEditandoCantidad(index);
          setNuevaCantidad(String(articulosUbicacion[index].cantidad ?? 0));
        }}
        onChangeValor={setNuevaCantidad}
        onGuardarEdicion={handleGuardarCantidad}
      />
    </View>
  );


}

const conmutadorEstilo = {
  flexDirection: "row",
  backgroundColor: colors.surfaceAlt,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 3,
  margin: 12,
  marginBottom: 4,
  gap: 3,
};

const conmutadorBoton = {
  flex: 1,
  paddingVertical: 9,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
};

const conmutadorActivo = {
  backgroundColor: colors.primary,
};

const conmutadorTexto = {
  fontSize: 14,
  fontWeight: "700",
  color: colors.textSecondary,
};

const conmutadorTextoActivo = {
  color: "#FFFFFF",
};

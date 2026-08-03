import { useState } from "react";
import {
ScrollView,
View,
Text,
TouchableOpacity,
ActivityIndicator,
Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { obtenerUbicaciones } from "../services/ubicacionesService";
import InventoryService from "../services/InventoryService";
import ArticulosModal from "../components/ArticulosModal";
import { colors } from "../styles/styles";

export default function EstadoScreen() {

const insets = useSafeAreaInsets();

const [secciones, setSecciones] = useState([]);
const [cargando, setCargando] = useState(false);
const [cargado, setCargado] = useState(false);

// Secciones abiertas
const [seccionesAbiertas, setSeccionesAbiertas] = useState({});

// Áreas abiertas
const [areasAbiertas, setAreasAbiertas] = useState({});

// Modal de artículos
const [modalVisible, setModalVisible] = useState(false);
const [modalUbicacion, setModalUbicacion] = useState(null);
const [articulosUbicacion, setArticulosUbicacion] = useState([]);
const [editandoCantidad, setEditandoCantidad] = useState(null);
const [nuevaCantidad, setNuevaCantidad] = useState("");

const coloresEstado = {
    Inicio: "#95A5A6",
    Proceso: "#F39C12",
    Fin: "#2ECC71",
};

const obtenerColor = (estado) => {
    return coloresEstado[estado] || "#95A5A6";
};

const cargar = async () => {
    try {
        setCargando(true);

        const datos = await obtenerUbicaciones();

        console.log(
            "ESTRUCTURA ESTADO:",
            JSON.stringify(datos, null, 2)
        );

        setSecciones(datos);
        setCargado(true);

    } catch (error) {
        console.error("Error cargando ubicaciones:", error);
        Alert.alert("Error", "No se pudieron cargar las ubicaciones");
    } finally {
        setCargando(false);
    }
};

const alternarSeccion = (seccion) => {
    setSeccionesAbiertas((actual) => ({
        ...actual,
        [seccion]: !actual[seccion],
    }));
};

const alternarArea = (seccion, area) => {

    const id = `${seccion}-${area}`;

    setAreasAbiertas((actual) => ({
        ...actual,
        [id]: !actual[id],
    }));
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

const handleEliminarArticulo = (index) => {
    const articulo = articulosUbicacion[index];
    Alert.alert(
        "Eliminar artículo",
        `¿Eliminar ${articulo.articulo} de ${articulo.ubicacion}?`,
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    try {
                        await InventoryService.eliminarMovimiento(
                            articulo.ubicacion,
                            articulo.articulo
                        );
                        setArticulosUbicacion(prev =>
                            prev.filter((_, i) => i !== index)
                        );
                    } catch (e) {
                        console.error(e);
                        Alert.alert("Error", "No se pudo eliminar el artículo");
                    }
                },
            },
        ]
    );
};

return (
    <View style={{ flex: 1 }}>

        {/* =========================
            CABECERA
        ========================= */}

        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: insets.top + 10,
                paddingHorizontal: 15,
                paddingBottom: 5,
            }}
        >
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                }}
            >
                Estado
            </Text>

            <TouchableOpacity
                onPress={cargar}
                activeOpacity={0.7}
                style={{
                    padding: 8,
                }}
            >
                <MaterialIcons
                    name="refresh"
                    size={28}
                    color={colors.primary}
                />
            </TouchableOpacity>
        </View>

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

                        {seccionAbierta &&
                            seccion.areas?.map((area) => {

                                const areaId =
                                    `${seccion.seccion}-${area.area}`;

                                const areaAbierta =
                                    areasAbiertas[areaId];

                                return (
                                    <View
                                        key={areaId}
                                        style={{
                                            marginLeft: 15,
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
                                                        color: "#777",
                                                    }}
                                                >
                                                    {area.stat}
                                                </Text>

                                            </View>

                                        </TouchableOpacity>


                                        {/* =========================
                                            UBICACIONES
                                        ========================= */}

                                        {areaAbierta &&
                                            area.ubicaciones?.map(
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
                                                                    color: "#777",
                                                                }}
                                                            >
                                                                {
                                                                    ubicacion.stat
                                                                }
                                                            </Text>

                                                        </View>

                                                    </TouchableOpacity>

                                                )
                                            )}

                                    </View>
                                );
                            })}

                    </View>
                );
            })}

        </ScrollView>
        )}

        <ArticulosModal
            visible={modalVisible}
            titulo={modalUbicacion}
            articulos={articulosUbicacion}
            onCerrar={() => setModalVisible(false)}
            editandoIndex={editandoCantidad}
            editandoValor={nuevaCantidad}
            onIniciarEdicion={(index) => {
                setEditandoCantidad(index);
                setNuevaCantidad(String(articulosUbicacion[index].cantidad ?? 0));
            }}
            onChangeValor={setNuevaCantidad}
            onGuardarEdicion={handleGuardarCantidad}
            onEliminar={handleEliminarArticulo}
        />
    </View>
);


}

import { useEffect, useState } from "react";
import {
ScrollView,
View,
Text,
TouchableOpacity,
ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { obtenerUbicaciones } from "../services/ubicacionesService";

export default function EstadoScreen() {

const insets = useSafeAreaInsets();

const [secciones, setSecciones] = useState([]);
const [cargando, setCargando] = useState(true);

// Secciones abiertas
const [seccionesAbiertas, setSeccionesAbiertas] = useState({});

// Áreas abiertas
const [areasAbiertas, setAreasAbiertas] = useState({});

const coloresEstado = {
    Inicio: "#95A5A6",
    Proceso: "#F39C12",
    Fin: "#2ECC71",
};

const obtenerColor = (estado) => {
    return coloresEstado[estado] || "#95A5A6";
};

useEffect(() => {
    cargar();
}, []);

const cargar = async () => {
    try {
        setCargando(true);

        const datos = await obtenerUbicaciones();

        console.log(
            "ESTRUCTURA ESTADO:",
            JSON.stringify(datos, null, 2)
        );

        setSecciones(datos);

    } catch (error) {
        console.error("Error cargando ubicaciones:", error);
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

if (cargando) {
    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <ActivityIndicator size="large" />
        </View>
    );
}

return (
    <ScrollView
        contentContainerStyle={{
            padding: 15,
            paddingBottom: 30,
            paddingTop: insets.top + 10,
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

                                                <View
                                                    key={
                                                        ubicacion.ubicacion
                                                    }
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

                                                </View>

                                            )
                                        )}

                                </View>
                            );
                        })}

                </View>
            );
        })}

    </ScrollView>
);


}

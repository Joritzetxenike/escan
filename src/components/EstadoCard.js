import { View, Text } from "react-native";

export default function EstadoCard({ ubicacion }) {

    const colores = {
        verde: "#2ECC71",
        amarillo: "#F1C40F",
        rojo: "#E74C3C",
    };

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 15,
                marginVertical: 6,
                borderRadius: 10,
                backgroundColor: "#FFF",
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 18, fontWeight: "600" }}>
                {ubicacion.codigo}
            </Text>

            <View
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colores[ubicacion.estado],
                }}
            />

            <Text>{ubicacion.ocupacion}%</Text>
        </View>
    );
}
import { View, Text } from "react-native";

export default function EstadoCard({ ubicacion }) {


const coloresEstado = {
    Inicio: "#7F8C8D",
    Proceso: "#F39C12",
    Fin: "#2ECC71",
};

const color = coloresEstado[ubicacion.stat] || "#7F8C8D";

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

        <View style={{ flex: 1 }}>

            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "600",
                }}
            >
                {ubicacion.ubicacion}
            </Text>

            <Text
                style={{
                    fontSize: 13,
                    color: "#4B5563",
                    marginTop: 3,
                }}
            >
                Sección {ubicacion.seccion} · Área {ubicacion.area}
            </Text>

        </View>

        <View
            style={{
                alignItems: "center",
                marginLeft: 10,
            }}
        >

            <View
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: color,
                }}
            />

            <Text
                style={{
                    fontSize: 12,
                    marginTop: 4,
                }}
            >
                {ubicacion.stat}
            </Text>

        </View>

    </View>
);


}

import { useEffect, useState } from "react";
import { FlatList, SafeAreaView } from "react-native";
import EstadoCard from "../components/EstadoCard";
import { obtenerUbicaciones } from "../services/ubicacionesService";

export default function EstadoScreen() {

    const [ubicaciones, setUbicaciones] = useState([]);

    useEffect(() => {
        cargar();
    }, []);

    const cargar = async () => {
        const datos = await obtenerUbicaciones();
        setUbicaciones(datos);
    };

    return (
        <SafeAreaView style={{ flex: 1, padding: 15 }}>
            <FlatList
                data={ubicaciones}
                keyExtractor={(item) => item.codigo}
                renderItem={({ item }) => (
                    <EstadoCard ubicacion={item} />
                )}
            />
        </SafeAreaView>
    );
}
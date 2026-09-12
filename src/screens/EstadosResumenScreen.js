import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { obtenerEstadoUbicaciones } from "../services/ubicacionesService";
import { resumirEstados, STATUSES_RESUMEN } from "../helpers/estadosResumenHelper";
import { colors } from "../styles/styles";

export const COLORES_ESTADO = {
  Inicio: "#7F8C8D",
  Proceso: "#F39C12",
  Fin: "#2ECC71",
};

export default function EstadosResumenScreen({ navigation }) {
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError(false);
    try {
      const arbol = await obtenerEstadoUbicaciones();
      setResumen(resumirEstados(arbol));
    } catch (e) {
      console.error("Error cargando resumen:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const blocker = [
    { clave: "secciones", etiqueta: "Secciones" },
    { clave: "areas", etiqueta: "Áreas" },
    { clave: "ubicaciones", etiqueta: "Ubicaciones" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumen de estados</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Porcentaje de secciones, áreas y ubicaciones en cada estado
        </Text>

        {cargando && <ActivityIndicator size="large" color={colors.primary} />}

        {error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No se pudieron cargar los estados
            </Text>
            <TouchableOpacity style={styles.reloadButton} onPress={cargar}>
              <Text style={styles.reloadText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!cargando && !error && resumen && (
          <>
            {blocker.map(({ clave, etiqueta }) => {
              const bloque = resumen[clave];
              return (
                <View key={clave} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{etiqueta}</Text>
                    <Text style={styles.cardTotal}>
                      {bloque.total === 0
                        ? "Sin datos"
                        : `Total: ${bloque.total}`}
                    </Text>
                  </View>

                  {STATUSES_RESUMEN.map((stat) => {
                    const { cantidad, porcentaje } = bloque.desglose[stat];
                    return (
                      <View key={stat} style={styles.row}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: COLORES_ESTADO[stat] },
                          ]}
                        />
                        <Text style={styles.statLabel}>{stat}</Text>
                        <Text style={styles.statCount}>{cantidad}</Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${porcentaje}%`,
                                backgroundColor: COLORES_ESTADO[stat],
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.statPercent}>{porcentaje}%</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardTotal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statLabel: {
    fontSize: 14,
    width: 70,
  },
  statCount: {
    fontSize: 14,
    fontWeight: "600",
    width: 30,
    textAlign: "right",
    marginRight: 8,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  statPercent: {
    fontSize: 14,
    fontWeight: "700",
    width: 46,
    textAlign: "right",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  reloadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  reloadText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
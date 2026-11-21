import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../styles/styles';
import { listarPlanos, urlPlano } from '../services/planosService';

/* =======================================================
 * PLANOS DE UNA SECCIÓN (y de su área, si se indica)
 * =======================================================
 *
 * Solo consulta y con conexión. Los planos se suben desde el
 * panel web.
 *
 *   - PDF    → se abre fuera de la app (navegador o visor de
 *              PDF del móvil), que es donde hay zoom y páginas.
 *   - Imagen → se ve aquí mismo, ajustada a la pantalla, con
 *              «Abrir en el navegador» para hacer zoom.
 * ======================================================= */

const formatearTamano = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function PlanosModal({ visible, seccion, area, onCerrar }) {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [abriendo, setAbriendo] = useState(null);
  const [imagen, setImagen] = useState(null);

  const cargar = useCallback(async () => {
    if (!seccion) return;

    setCargando(true);
    setError(null);

    try {
      const [deSeccion, deArea] = await Promise.all([
        listarPlanos(seccion),
        area ? listarPlanos(seccion, area) : Promise.resolve([]),
      ]);

      setGrupos([
        { clave: 'seccion', titulo: `Sección ${seccion}`, planos: deSeccion },
        ...(area ? [{ clave: 'area', titulo: `Área ${area}`, planos: deArea }] : []),
      ]);
    } catch (e) {
      setGrupos([]);
      setError(e.message || 'No se pudieron cargar los planos');
    } finally {
      setCargando(false);
    }
  }, [seccion, area]);

  useEffect(() => {
    if (visible) {
      cargar();
    } else {
      setGrupos([]);
      setError(null);
      setImagen(null);
      setAbriendo(null);
    }
  }, [visible, cargar]);

  const abrir = async (plano) => {
    setAbriendo(plano.ruta);
    setError(null);

    try {
      const url = await urlPlano(plano.ruta);

      if (plano.tipo === 'imagen') {
        setImagen({ nombre: plano.nombre, url });
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      setError(e.message || 'No se pudo abrir el plano');
    } finally {
      setAbriendo(null);
    }
  };

  const total = grupos.reduce((n, g) => n + g.planos.length, 0);

  const titulo = area ? `Sección ${seccion} · Área ${area}` : `Sección ${seccion}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={imagen ? () => setImagen(null) : onCerrar}>
      <View style={estilos.overlay}>
        <View style={estilos.modal}>

          {imagen ? (
            /* ---------- Imagen a pantalla ---------- */
            <>
              <Text style={estilos.titulo} numberOfLines={2}>{imagen.nombre}</Text>

              <View style={estilos.marcoImagen}>
                <Image
                  source={{ uri: imagen.url }}
                  style={estilos.imagen}
                  resizeMode="contain"
                  accessibilityLabel={`Plano ${imagen.nombre}`}
                  testID="plano-imagen"
                />
              </View>

              <TouchableOpacity
                style={[estilos.boton, estilos.botonSecundario]}
                onPress={() => Linking.openURL(imagen.url)}
                testID="btn-abrir-navegador"
              >
                <MaterialIcons name="open-in-new" size={20} color={colors.primary} />
                <Text style={estilos.botonSecundarioTexto}>Abrir en el navegador (zoom)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.boton}
                onPress={() => setImagen(null)}
                testID="btn-volver-planos"
              >
                <Text style={estilos.botonTexto}>Volver a los planos</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ---------- Lista ---------- */
            <>
              <Text style={estilos.eyebrow}>Planos</Text>
              <Text style={estilos.titulo}>{titulo}</Text>

              {error && (
                <View style={estilos.error} testID="planos-error">
                  <Text style={estilos.errorTexto}>{error}</Text>
                  <TouchableOpacity onPress={cargar} testID="btn-reintentar-planos">
                    <Text style={estilos.enlace}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {cargando ? (
                <ActivityIndicator style={{ marginVertical: 30 }} color={colors.primary} />
              ) : (
                <ScrollView style={estilos.lista}>
                  {!error && total === 0 ? (
                    <Text style={estilos.vacio}>Esta sección no tiene planos.</Text>
                  ) : (
                    grupos.map((grupo) => (
                      <View key={grupo.clave} style={estilos.grupo}>
                        <Text style={estilos.grupoTitulo}>{grupo.titulo}</Text>

                        {grupo.planos.length === 0 ? (
                          <Text style={estilos.vacioGrupo}>Sin planos.</Text>
                        ) : (
                          grupo.planos.map((plano) => (
                            <TouchableOpacity
                              key={plano.ruta}
                              style={estilos.item}
                              onPress={() => abrir(plano)}
                              disabled={abriendo !== null}
                              accessibilityRole="button"
                              testID={`plano-${plano.ruta}`}
                            >
                              <MaterialIcons
                                name={plano.tipo === 'pdf' ? 'picture-as-pdf' : 'image'}
                                size={26}
                                color={colors.primary}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={estilos.itemNombre}>{plano.nombre}</Text>
                                <Text style={estilos.itemDetalle}>
                                  {[plano.tipo === 'pdf' ? 'PDF' : 'Imagen', formatearTamano(plano.bytes)]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </View>
                              {abriendo === plano.ruta ? (
                                <ActivityIndicator color={colors.primary} />
                              ) : (
                                <MaterialIcons
                                  name={plano.tipo === 'pdf' ? 'open-in-new' : 'chevron-right'}
                                  size={22}
                                  color={colors.textSecondary}
                                />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
              )}

              <TouchableOpacity style={estilos.boton} onPress={onCerrar} testID="btn-cerrar-planos">
                <Text style={estilos.botonTexto}>Cerrar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    maxHeight: '92%',
  },
  eyebrow: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  lista: {
    flexGrow: 0,
  },
  grupo: {
    marginBottom: 12,
  },
  grupoTitulo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemNombre: {
    fontSize: 15,
    color: colors.text,
  },
  itemDetalle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  vacio: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: 20,
  },
  vacioGrupo: {
    color: colors.textSecondary,
    marginLeft: 8,
  },
  error: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    gap: 6,
  },
  errorTexto: {
    color: colors.danger,
    textAlign: 'center',
  },
  enlace: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  marcoImagen: {
    height: 420,
    maxHeight: '70%',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  boton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonSecundario: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  botonSecundarioTexto: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
});

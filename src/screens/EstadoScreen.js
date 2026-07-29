import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { obtenerUbicaciones } from '../services/ubicacionesService';

export default function EstadoScreen() {

  const [secciones, setSecciones] = useState([]);

  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const [areasAbiertas, setAreasAbiertas] = useState({});

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {

    try {

      const datos = await obtenerUbicaciones();

      setSecciones(datos);

    } catch (error) {

      console.error('Error cargando ubicaciones:', error);

    }

  };

  /* =====================================================
   * EXPANDIR / CONTRAER
   * ===================================================== */

  const toggleSeccion = (seccion) => {

    setSeccionesAbiertas(prev => ({
      ...prev,
      [seccion]: !prev[seccion],
    }));

  };

  const toggleArea = (seccion, area) => {

    const key = `${seccion}-${area}`;

    setAreasAbiertas(prev => ({
      ...prev,
      [key]: !prev[key],
    }));

  };

  /* =====================================================
   * ESTADO
   * ===================================================== */

  const obtenerColorEstado = (stat) => {

    switch (stat) {

      case 'Inicio':
        return '#999999';

      case 'En proceso':
        return '#F5A623';

      case 'Finalizado':
        return '#28A745';

      default:
        return '#999999';

    }

  };

  /* =====================================================
   * UBICACIÓN
   * ===================================================== */

  const renderUbicacion = ({ item }) => {

    return (
      <View
        style={{
          marginLeft: 55,
          marginTop: 6,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: '#F5F5F5',
          borderRadius: 6,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >

        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: obtenerColorEstado(item.stat),
            marginRight: 10,
          }}
        />

        <View>

          <Text
            style={{
              fontWeight: 'bold',
            }}
          >
            {item.ubicacion}
          </Text>

          <Text
            style={{
              color: '#666',
              marginTop: 2,
            }}
          >
            {item.stat}
          </Text>

        </View>

      </View>
    );

  };

  /* =====================================================
   * ÁREA
   * ===================================================== */

  const renderArea = ({ item, seccion }) => {

    const key = `${seccion}-${item.area}`;
    const abierta = areasAbiertas[key];

    return (
      <View>

        <TouchableOpacity
          onPress={() => toggleArea(seccion, item.area)}
          style={{
            marginLeft: 30,
            marginTop: 10,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >

          <Text
            style={{
              width: 25,
              fontSize: 16,
            }}
          >
            {abierta ? '▼' : '▶'}
          </Text>

          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: obtenerColorEstado(item.stat),
              marginRight: 10,
            }}
          />

          <View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              Área {item.area}
            </Text>

            <Text
              style={{
                color: '#666',
              }}
            >
              {item.stat}
            </Text>

          </View>

        </TouchableOpacity>

        {abierta && (

          <FlatList
            data={item.ubicaciones}
            keyExtractor={(ubicacion) => ubicacion.ubicacion}
            renderItem={renderUbicacion}
          />

        )}

      </View>
    );

  };

  /* =====================================================
   * SECCIÓN
   * ===================================================== */

  const renderSeccion = ({ item }) => {

    const abierta = seccionesAbiertas[item.seccion];

    return (
      <View
        style={{
          marginBottom: 10,
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          padding: 10,
        }}
      >

        <TouchableOpacity
          onPress={() => toggleSeccion(item.seccion)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
          }}
        >

          <Text
            style={{
              width: 30,
              fontSize: 18,
            }}
          >
            {abierta ? '▼' : '▶'}
          </Text>

          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: obtenerColorEstado(item.stat),
              marginRight: 10,
            }}
          />

          <View>

            <Text
              style={{
                fontSize: 19,
                fontWeight: 'bold',
              }}
            >
              Sección {item.seccion}
            </Text>

            <Text
              style={{
                color: '#666',
              }}
            >
              {item.stat}
            </Text>

          </View>

        </TouchableOpacity>

        {abierta && (

          <FlatList
            data={item.areas}
            keyExtractor={(area) =>
              `${item.seccion}-${area.area}`
            }
            renderItem={({ item: area }) =>
              renderArea({
                item: area,
                seccion: item.seccion,
              })
            }
          />

        )}

      </View>
    );

  };

  /* =====================================================
   * VISTA
   * ===================================================== */

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
        backgroundColor: '#EEEEEE',
      }}
    >

      <FlatList
        data={secciones}
        keyExtractor={(item) => item.seccion}
        renderItem={renderSeccion}
      />

    </View>
  );
}
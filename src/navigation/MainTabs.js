import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

import HomeScreen from '../screens/HomeScreen';
import ListaScreen from '../screens/ListaScreen';
import EstadoScreen from '../screens/EstadoScreen';
import HeaderTabs from '../components/HeaderTabs';
import ImportarArchivoModal from '../components/ImportarArchivoModal';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/styles';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { esAdminEmergencia } = useAuth();

  const [mostrarImportModal, setMostrarImportModal] = useState(false);

  const onImportarEmergencia = () => {
    setMostrarImportModal(true);
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => (
          <HeaderTabs
            titulo={options.title ?? route.name}
            esAdminEmergencia={
              route.name === 'Lista' ? esAdminEmergencia : false
            }
            onImportarEmergencia={onImportarEmergencia}
          />
        ),

        tabBarStyle: {
          backgroundColor: colors.primary,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },

        tabBarActiveTintColor: colors.onPrimary,
        tabBarInactiveTintColor: colors.onPrimaryMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Lista"
        component={ListaScreen}
        options={{
          title: 'Lista de escaneos',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Estado"
        component={EstadoScreen}
        options={{
          title: 'Estado',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assessment" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>

    {mostrarImportModal && (
      <ImportarArchivoModal
        visible={mostrarImportModal}
        onCerrar={() => setMostrarImportModal(false)}
        onArchivoSeleccionado={(resultado) => {
          setMostrarImportModal(false);
        }}
      />
    )}
  );
}

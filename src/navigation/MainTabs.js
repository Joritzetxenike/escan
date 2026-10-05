import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ListaScreen from '../screens/ListaScreen';
import EstadoScreen from '../screens/EstadoScreen';
import { colors } from '../styles/styles';

const Tab = createBottomTabNavigator();

export default function MainTabs() {

  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,

        /* Cabecera y tab bar en el celeste de marca, el mismo
           de los botones de escanear. El casi negro se queda
           para la cámara.

           Contraste sobre `primary` (#00729E):
             blanco            5.38:1  títulos y pestaña activa
             onPrimaryMuted    4.71:1  etiqueta e icono inactivos
           El inactivo no puede bajarse más: a 3.23:1 (un gris
           tipo #C3C9D1) se queda por debajo del mínimo 4.5:1. */

        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
        },
        headerTitleAlign: 'center',

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
  );
}
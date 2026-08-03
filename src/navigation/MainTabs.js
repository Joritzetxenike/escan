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
        headerShown: false,

        tabBarStyle: {
          backgroundColor: colors.primaryDark,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },

        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#C3C9D1',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Lista"
        component={ListaScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Estado"
        component={EstadoScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assessment" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
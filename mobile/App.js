import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from './src/AuthContext';
import { font, ThemeProvider, useTheme } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import FeedScreen from './src/screens/FeedScreen';
import PostScreen from './src/screens/PostScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Outline icon normally, filled when the tab is active
const tabIcon = (name) => ({ focused, color }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />
);

function Tabs() {
  const { colors: c } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // each tab draws its own large title
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.divider, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen name="Browse" component={FeedScreen} options={{ title: 'Campus Lost & Found', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Report" component={PostScreen} options={{ title: 'Report an item', tabBarLabel: 'Report', tabBarIcon: tabIcon('add-circle') }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity', tabBarIcon: tabIcon('albums') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { user, loading } = useAuth();
  const { colors: c } = useTheme();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.muted} />
      </View>
    );
  }
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Home" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item details', headerTitle: '' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false, title: 'Campus Lost & Found' }} />
      )}
    </Stack.Navigator>
  );
}

function ThemedApp() {
  const { colors: c, isDark } = useTheme();
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.bg, text: c.text, border: c.divider },
    };
  }, [isDark, c]);

  return (
    <>
      <NavigationContainer theme={navTheme}>
        <Root />
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

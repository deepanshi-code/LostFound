import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from './src/AuthContext';
import { BrandGradient } from './src/decor';
import { font, ThemeProvider, useTheme } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
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

// The raised round "+" in the middle of the tab bar
function ReportButton({ onPress, accessibilityState }) {
  const { colors: c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Report an item" style={{ flex: 1, alignItems: 'center' }}>
      {({ pressed }) => (
        <BrandGradient style={{
          width: 58, height: 58, borderRadius: 29, marginTop: -22, alignItems: 'center', justifyContent: 'center',
          borderWidth: 4, borderColor: c.card, boxShadow: `0 10px 22px ${c.primary}55`,
          transform: [{ scale: pressed ? 0.92 : accessibilityState?.selected ? 1.04 : 1 }],
        }}>
          <Ionicons name="add" size={30} color="#fff" />
        </BrandGradient>
      )}
    </Pressable>
  );
}

function Tabs() {
  const { colors: c } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // each tab draws its own large title
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.divider, height: 68, paddingTop: 6, boxShadow: `0 -6px 24px ${c.shadow}` },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
      }}
    >
      <Tab.Screen name="Browse" component={FeedScreen} options={{ title: 'Campus Lost & Found', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore', tabBarIcon: tabIcon('compass') }} />
      <Tab.Screen name="Report" component={PostScreen} options={{ title: 'Report an item', tabBarLabel: () => null, tabBarButton: (props) => <ReportButton {...props} /> }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity', tabBarIcon: tabIcon('albums') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tab.Navigator>
  );
}

const ONBOARDED_KEY = 'lf_onboarded';

function Root() {
  const { user, loading } = useAuth();
  const { colors: c } = useTheme();
  // Welcome slides show once, to people who aren't logged in yet
  const [onboarded, setOnboarded] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === '1')).catch(() => setOnboarded(true));
  }, []);
  const finishWelcome = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  };

  if (loading || onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.muted} />
      </View>
    );
  }
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.sky[0] },
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
      ) : !onboarded ? (
        <Stack.Screen name="Welcome" options={{ headerShown: false, title: 'Welcome' }}>
          {() => <WelcomeScreen onDone={finishWelcome} />}
        </Stack.Screen>
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
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
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

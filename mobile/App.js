import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { api } from './src/api';
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
const navigationRef = createNavigationContainerRef();

// URLs for screens, so links in emails (https://…/item/12) open the right item
const linking = {
  prefixes: ['campuslostfound://', 'https://lostfound-mobile.vercel.app'],
  config: {
    initialRouteName: 'Home', // so Back from a linked item goes to the app, not out of it
    screens: {
      Home: { screens: { Browse: '', Explore: 'explore', Report: 'report', Activity: 'activity', Profile: 'profile' } },
      ItemDetail: { path: 'item/:id', parse: { id: Number } },
    },
  },
};
const itemIdFromUrl = (url) => Number(String(url || '').match(/\/item\/(\d+)/)?.[1]) || null;

// Outline icon normally, filled when the tab is active
const tabIcon = (name) => ({ focused, color }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />
);

// The "+" in the middle of the tab bar: a compact rounded square, level with the other tabs
function ReportButton({ onPress, accessibilityState }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Report an item" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {({ pressed }) => (
        <BrandGradient style={{
          width: 44, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
          opacity: accessibilityState?.selected ? 0.85 : 1, transform: [{ scale: pressed ? 0.94 : 1 }],
        }}>
          <Ionicons name="add" size={24} color="#fff" />
        </BrandGradient>
      )}
    </Pressable>
  );
}

function Tabs() {
  const { colors: c } = useTheme();
  // Responses waiting for my approval, shown as a badge on Activity
  const [pending, setPending] = useState(0);
  const refreshBadge = useCallback(() => {
    api('/claims/pending-count').then((r) => setPending(r.count)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshBadge();
    const timer = setInterval(refreshBadge, 60_000);
    return () => clearInterval(timer);
  }, [refreshBadge]);

  return (
    <Tab.Navigator
      screenListeners={{ focus: refreshBadge }}
      screenOptions={{
        headerShown: false, // each tab draws its own large title
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.divider, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen name="Browse" component={FeedScreen} options={{ title: 'Campus Lost & Found', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore', tabBarIcon: tabIcon('compass') }} />
      <Tab.Screen name="Report" component={PostScreen} options={{ title: 'Report an item', tabBarLabel: () => null, tabBarButton: (props) => <ReportButton {...props} /> }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{
        title: 'Activity', tabBarIcon: tabIcon('albums'), tabBarBadge: pending || undefined,
        tabBarBadgeStyle: { backgroundColor: c.lost, color: '#fff', fontFamily: font.bold, fontSize: 11 },
      }} />
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

  // An item link opened while logged out is remembered and opened right after login
  const pendingItem = useRef(null);
  useEffect(() => {
    Linking.getInitialURL().then((url) => { pendingItem.current = itemIdFromUrl(url); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user || !pendingItem.current || !navigationRef.isReady()) return;
    const id = pendingItem.current;
    pendingItem.current = null;
    navigationRef.navigate('ItemDetail', { id });
  }, [user]);

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
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item details', headerShown: false }} />
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
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
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

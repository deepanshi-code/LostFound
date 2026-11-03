import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Calm, photo-first palette (Airbnb / Apple feel): white space, refined greys, one brand blue.
// The brand gradient is kept only for primary actions. Muted red/green are used only for Lost/Found status.
const light = {
  bg: '#FFFFFF',
  sky: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], // page background (flat on purpose)
  surface: '#F7F7F7',     // inputs, skeletons, segmented control
  card: '#FFFFFF',
  raised: '#FFFFFF',      // selected segment
  border: '#DDDDDD',
  divider: '#EBEBEB',
  text: '#222222',
  muted: '#6A6A6A',
  faint: '#929292',
  primary: '#2F5BFF',
  primaryEnd: '#5B3DF5',  // brand gradient end
  primarySoft: '#EEF2FF',
  onPrimary: '#FFFFFF',
  line: '#C9D3F0',        // illustration strokes
  lost: '#C13515',
  lostSoft: '#FFF1EC',
  found: '#008A05',
  foundSoft: '#EBF7EC',
  warn: '#8F5A00',
  warnSoft: '#FFF6E5',
  danger: '#C13515',
  dangerSoft: '#FFF1EC',
  shadow: 'rgba(0, 0, 0, 0.08)',
  glass: 'rgba(255, 255, 255, 0.94)',
};

const dark = {
  bg: '#121212',
  sky: ['#121212', '#121212', '#121212'],
  surface: '#1F1F1F',
  card: '#1A1A1A',
  raised: '#2C2C2C',
  border: '#3A3A3A',
  divider: '#272727',
  text: '#F7F7F7',
  muted: '#B0B0B0',
  faint: '#7D7D7D',
  primary: '#6B8AFF',
  primaryEnd: '#8B6CFF',
  primarySoft: '#1E2440',
  onPrimary: '#FFFFFF',
  line: '#3A4566',
  lost: '#FF8A70',
  lostSoft: '#2D1A15',
  found: '#5FD068',
  foundSoft: '#14261A',
  warn: '#F0B85C',
  warnSoft: '#2A2213',
  danger: '#FF8A70',
  dangerSoft: '#2D1A15',
  shadow: 'rgba(0, 0, 0, 0.5)',
  glass: 'rgba(26, 26, 26, 0.94)',
};

// Plus Jakarta Sans, loaded in App.js. Custom fonts carry their own weight, so use fontFamily, not fontWeight.
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

const THEME_KEY = 'lf_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system'); // 'system' | 'light' | 'dark'
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => { if (['system', 'light', 'dark'].includes(saved)) setModeState(saved); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((m) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  }, []);

  const isDark = (mode === 'system' ? system : mode) === 'dark';
  const value = useMemo(() => ({ mode, setMode, isDark, colors: isDark ? dark : light }), [mode, setMode, isDark]);

  // Avoid flashing the wrong theme while the saved choice loads
  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Define style factories at module level: const makeStyles = (c) => ({ ... })
// then inside a component: const s = useStyles(makeStyles);
export function useStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}

// Soft card shadow used across the app
export const softShadow = (c, y = 8, blur = 28) => ({ boxShadow: `0 ${y}px ${blur}px ${c.shadow}` });

// Pastel version of an accent colour (category tiles, thumbnails)
export const tint = (hex, isDark) => hex + (isDark ? '2E' : '1F');

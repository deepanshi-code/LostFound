import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Neutral surfaces, one brand blue, and muted red/green used only for status.
const light = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',     // inputs, thumbnails, segmented control
  card: '#FFFFFF',
  raised: '#FFFFFF',      // selected segment, sits above surface
  border: '#E6E6EA',
  divider: '#EFEFF2',
  text: '#0D0D12',
  muted: '#62636E',
  faint: '#9B9CA6',
  primary: '#3451D1',
  primarySoft: '#EEF1FC',
  onPrimary: '#FFFFFF',
  lost: '#C2362F',
  lostSoft: '#FCEFEE',
  found: '#1F7A4A',
  foundSoft: '#ECF6F0',
  warn: '#9A5B06',
  warnSoft: '#FCF5E9',
  danger: '#C2362F',
  dangerSoft: '#FCEFEE',
  shadow: 'rgba(13, 13, 18, 0.06)',
};

const dark = {
  bg: '#0B0B0D',
  surface: '#17171B',
  card: '#111114',
  raised: '#2C2C33',
  border: '#26262C',
  divider: '#1C1C21',
  text: '#F1F1F4',
  muted: '#A0A1AB',
  faint: '#6C6D77',
  primary: '#8197FF',
  primarySoft: '#1A1F3D',
  onPrimary: '#0B0B0D',
  lost: '#FF8F87',
  lostSoft: '#2B1716',
  found: '#6CD49A',
  foundSoft: '#13261B',
  warn: '#EDB767',
  warnSoft: '#2A2213',
  danger: '#FF8F87',
  dangerSoft: '#2B1716',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

// Inter, loaded in App.js. Custom fonts carry their own weight, so use fontFamily, not fontWeight.
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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

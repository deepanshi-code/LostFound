import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "Campus sky": airy blue-white surfaces, a blue→violet brand gradient, soft shadows instead of borders.
// Muted red/green are used only for Lost/Found status.
const light = {
  bg: '#F3F6FD',
  sky: ['#E3ECFF', '#F1F5FE', '#F8FAFF'], // page background gradient, top to bottom
  surface: '#EDF1FA',     // inputs, thumbnails, segmented control
  card: '#FFFFFF',
  raised: '#FFFFFF',      // selected segment
  border: '#E2E8F4',
  divider: '#EDF0F7',
  text: '#0E1530',
  muted: '#59627D',
  faint: '#98A0B8',
  primary: '#2F5BFF',
  primaryEnd: '#6A45F5',  // brand gradient end
  primarySoft: '#EAEFFF',
  onPrimary: '#FFFFFF',
  line: '#A9BDF2',        // illustration strokes
  lost: '#C93A32',
  lostSoft: '#FDEEEC',
  found: '#18804F',
  foundSoft: '#E7F6EE',
  warn: '#9A5B06',
  warnSoft: '#FCF4E6',
  danger: '#C93A32',
  dangerSoft: '#FDEEEC',
  shadow: 'rgba(36, 64, 140, 0.10)',
  glass: 'rgba(255, 255, 255, 0.82)',
};

const dark = {
  bg: '#090D1A',
  sky: ['#101A3A', '#0B1124', '#090D1A'],
  surface: '#161D31',
  card: '#10162A',
  raised: '#28304A',
  border: '#232B44',
  divider: '#1A2138',
  text: '#EEF1FA',
  muted: '#A2AAC4',
  faint: '#6A7392',
  primary: '#5B7FFF',
  primaryEnd: '#8B6CFF',
  primarySoft: '#1B2350',
  onPrimary: '#FFFFFF',
  line: '#334477',
  lost: '#FF8F87',
  lostSoft: '#2C1718',
  found: '#6CD49A',
  foundSoft: '#12271D',
  warn: '#EDB767',
  warnSoft: '#2A2213',
  danger: '#FF8F87',
  dangerSoft: '#2C1718',
  shadow: 'rgba(0, 0, 0, 0.45)',
  glass: 'rgba(16, 22, 42, 0.86)',
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

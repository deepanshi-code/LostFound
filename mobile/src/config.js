import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

// Where the backend lives:
// 1. EXPO_PUBLIC_API_URL if set (e.g. a deployed server)
// 2. In the browser: same machine as the page
// 3. In Expo Go on a phone: the computer running `expo start` (same Wi-Fi)
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web') return `http://${window.location.hostname}:${API_PORT}`;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) return `http://${devHost}:${API_PORT}`;
  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

// Keep the names in sync with backend/src/db.js (the server validates against its own list).
// icon = Ionicons name, color = accent used for pastel tiles and icons
export const CATEGORIES = [
  { name: 'Phone', icon: 'phone-portrait-outline', color: '#4F7CFF' },
  { name: 'Laptop & Tablet', icon: 'laptop-outline', color: '#6D5BFF' },
  { name: 'Earphones', icon: 'headset-outline', color: '#A259FF' },
  { name: 'Charger & Cables', icon: 'battery-charging-outline', color: '#F59E0B' },
  { name: 'Gadgets', icon: 'hardware-chip-outline', color: '#06B6D4' },
  { name: 'Calculator', icon: 'calculator-outline', color: '#10B981' },
  { name: 'ID Card', icon: 'card-outline', color: '#3B82F6' },
  { name: 'Wallet & Cash', icon: 'wallet-outline', color: '#F97316' },
  { name: 'Keys', icon: 'key-outline', color: '#EAB308' },
  { name: 'Bag', icon: 'bag-handle-outline', color: '#EF4444' },
  { name: 'Books & Notes', icon: 'book-outline', color: '#22C55E' },
  { name: 'Stationery', icon: 'pencil-outline', color: '#F472B6' },
  { name: 'Documents', icon: 'document-text-outline', color: '#64748B' },
  { name: 'Clothing', icon: 'shirt-outline', color: '#8B5CF6' },
  { name: 'Shoes', icon: 'footsteps-outline', color: '#FB7185' },
  { name: 'Spectacles', icon: 'glasses-outline', color: '#0EA5E9' },
  { name: 'Watch', icon: 'watch-outline', color: '#14B8A6' },
  { name: 'Jewellery', icon: 'diamond-outline', color: '#EC4899' },
  { name: 'Bottle & Tiffin', icon: 'water-outline', color: '#06B6D4' },
  { name: 'Umbrella', icon: 'umbrella-outline', color: '#6366F1' },
  { name: 'Sports Gear', icon: 'tennisball-outline', color: '#84CC16' },
  { name: 'Other', icon: 'cube-outline', color: '#94A3B8' },
];

export const categoryMeta = (name) =>
  CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];

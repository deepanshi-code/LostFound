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
// icon = Ionicons name
export const CATEGORIES = [
  { name: 'Phone', icon: 'phone-portrait-outline' },
  { name: 'Laptop & Tablet', icon: 'laptop-outline' },
  { name: 'Earphones', icon: 'headset-outline' },
  { name: 'Charger & Cables', icon: 'battery-charging-outline' },
  { name: 'Gadgets', icon: 'hardware-chip-outline' },
  { name: 'Calculator', icon: 'calculator-outline' },
  { name: 'ID Card', icon: 'card-outline' },
  { name: 'Wallet & Cash', icon: 'wallet-outline' },
  { name: 'Keys', icon: 'key-outline' },
  { name: 'Bag', icon: 'bag-handle-outline' },
  { name: 'Books & Notes', icon: 'book-outline' },
  { name: 'Stationery', icon: 'pencil-outline' },
  { name: 'Documents', icon: 'document-text-outline' },
  { name: 'Clothing', icon: 'shirt-outline' },
  { name: 'Shoes', icon: 'footsteps-outline' },
  { name: 'Spectacles', icon: 'glasses-outline' },
  { name: 'Watch', icon: 'watch-outline' },
  { name: 'Jewellery', icon: 'diamond-outline' },
  { name: 'Bottle & Tiffin', icon: 'water-outline' },
  { name: 'Umbrella', icon: 'umbrella-outline' },
  { name: 'Sports Gear', icon: 'tennisball-outline' },
  { name: 'Other', icon: 'cube-outline' },
];

export const categoryMeta = (name) =>
  CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];

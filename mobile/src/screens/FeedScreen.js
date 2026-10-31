import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES } from '../config';
import { BrandGradient, NoticeTicker, SkyBackground } from '../decor';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import { Chip, EmptyState, ErrorText, Segmented, SectionTitle, useUi } from '../ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const TIPS = [
  'Found something? Tap Report so its owner can find it',
  'Owners must describe a hidden detail before you hand an item over',
  'Meet in a public place on campus for handovers',
];

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState('all');
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (type !== 'all') params.set('type', type);
    if (category) params.set('category', category);
    if (query.trim()) params.set('q', query.trim());
    try {
      const [{ items }, stats] = await Promise.all([api(`/items?${params}`), api('/items/stats')]);
      setItems(items);
      setStats(stats);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, [type, category, query]);

  // Debounce so typing in the search box doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Refresh when coming back from posting or viewing an item.
  // Uses a ref so filter changes go through the debounce above, not this.
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(useCallback(() => { loadRef.current(); }, []));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = type !== 'all' || category || query.trim();
  const clearFilters = () => { setType('all'); setCategory(null); setQuery(''); };
  const initials = user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const header = (
    <View style={{ paddingTop: insets.top + 12 }}>
      <BrandGradient style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>{greeting()}, {user.name.split(' ')[0]}</Text>
            <Text style={s.heroTitle}>What are we finding today?</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Profile')} style={s.avatar} accessibilityLabel="Profile">
            <Text style={s.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        <View style={s.search}>
          <Ionicons name="search-outline" size={18} color={c.faint} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Search items, places…" placeholderTextColor={c.faint}
            returnKeyType="search" style={s.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.faint} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.stats}>
          <Stat value={stats?.lost_open} label="Lost" icon="help-buoy-outline" s={s} />
          <Stat value={stats?.found_open} label="Found" icon="hand-left-outline" s={s} />
          <Stat value={stats?.reunited} label="Returned" icon="checkmark-done-outline" s={s} />
        </View>
      </BrandGradient>

      <View style={{ marginTop: 16 }}>
        <NoticeTicker label="TIP" messages={TIPS} />
      </View>

      <View style={{ marginTop: 18 }}>
        <Segmented
          options={[{ value: 'all', label: 'All' }, { value: 'lost', label: 'Lost' }, { value: 'found', label: 'Found' }]}
          value={type}
          onChange={setType}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6 }}>
        <Chip label="All categories" icon="apps-outline" selected={!category} onPress={() => setCategory(null)} />
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.name} label={cat.name} icon={cat.icon} selected={category === cat.name}
            onPress={() => setCategory(category === cat.name ? null : cat.name)}
          />
        ))}
      </ScrollView>

      <SectionTitle
        style={{ marginTop: 8, marginBottom: 14 }}
        right={loaded ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : null}
      >
        {filtered ? 'Results' : 'Recently reported'}
      </SectionTitle>
      <ErrorText>{error}</ErrorText>
    </View>
  );

  return (
    <SkyBackground>
      <FlatList
        style={ui.screen}
        contentContainerStyle={ui.content}
        data={items}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => navigation.navigate('ItemDetail', { id: item.id })} />
        )}
        ListEmptyComponent={
          !loaded || error ? null : filtered ? (
            <EmptyState
              icon="search-outline" title="No matching items"
              subtitle="Try a different category or fewer words."
              action={<Chip label="Clear filters" icon="close" onPress={clearFilters} />}
            />
          ) : (
            <EmptyState
              icon="file-tray-outline" title="Nothing reported yet"
              subtitle="Lost or found something? Report it and the campus will help."
              action={<Chip label="Report an item" icon="add" onPress={() => navigation.navigate('Report')} />}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        keyboardShouldPersistTaps="handled"
      />
    </SkyBackground>
  );
}

function Stat({ value, label, icon, s }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
      <Text style={s.statValue}>{value ?? '–'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  hero: { borderRadius: 28, padding: 20, paddingTop: 22, overflow: 'hidden', boxShadow: `0 16px 36px ${c.primary}40` },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hello: { fontFamily: font.medium, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: font.extrabold, fontSize: 26, lineHeight: 32, color: '#fff', letterSpacing: -0.8, marginTop: 4 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: font.bold, fontSize: 15, color: '#fff' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: 16,
    paddingHorizontal: 16, marginTop: 20, boxShadow: '0 6px 16px rgba(10, 20, 60, 0.18)',
  },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: font.regular, color: c.text, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: {
    flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  statValue: { fontFamily: font.extrabold, fontSize: 22, color: '#fff', marginTop: 6, letterSpacing: -0.5 },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  chips: { marginTop: 12, marginHorizontal: -20 },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES } from '../config';
import GridCard, { GridCardSkeleton } from '../GridCard';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, Chip, EmptyState, ErrorText, useUi } from '../ui';

const ALL = { name: null, label: 'All', icon: 'apps-outline' };

export default function FeedScreen({ navigation, route }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // 2 photo columns on phones, 3 on tablets, 4 on wide screens
  const cols = width >= 1100 ? 4 : width >= 700 ? 3 : 2;

  const [type, setType] = useState('all');
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Explore opens Home with a category already chosen
  useEffect(() => {
    if (route.params?.category) { setCategory(route.params.category); setType('all'); }
  }, [route.params?.category, route.params?.t]);

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

  const header = (
    <View style={{ paddingTop: insets.top + 14 }}>
      <View style={s.topRow}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={c.text} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Search items or places" placeholderTextColor={c.muted}
            returnKeyType="search" style={s.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.faint} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile" style={s.avatar}>
          <Avatar name={user.name} size={44} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={s.catContent}>
        {[ALL, ...CATEGORIES.map((cat) => ({ name: cat.name, label: cat.name, icon: cat.icon }))].map((cat) => {
          const active = category === cat.name;
          return (
            <Pressable key={cat.label} onPress={() => setCategory(cat.name)} style={({ hovered }) => [s.cat, (active || hovered) && { opacity: 1 }]}>
              <Ionicons name={cat.icon} size={24} color={active ? c.text : c.muted} />
              <Text style={[s.catLabel, active && { color: c.text, fontFamily: font.semibold }]} numberOfLines={1}>{cat.label}</Text>
              <View style={[s.underline, active && { backgroundColor: c.text }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.filterRow}>
        <View style={s.types}>
          {[['all', 'All'], ['lost', 'Lost'], ['found', 'Found']].map(([value, label]) => (
            <Pressable key={value} onPress={() => setType(value)} style={[s.type, type === value && s.typeActive]}>
              <Text style={[s.typeText, type === value && { color: c.bg }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {loaded ? <Text style={s.count}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text> : null}
      </View>

      <Text style={s.heading}>{filtered ? 'Results' : 'Recently reported'}</Text>
      {stats && !filtered ? (
        <Text style={s.sub}>{stats.lost_open} still lost · {stats.found_open} waiting for their owner · {stats.reunited} returned</Text>
      ) : <View style={{ height: 14 }} />}
      <ErrorText>{error}</ErrorText>
    </View>
  );

  return (
    <View style={[ui.screen, { backgroundColor: c.bg }]}>
      <FlatList
        key={`grid-${cols}`} // numColumns can't change on the fly, so remount when it does
        contentContainerStyle={[ui.content, { maxWidth: 1240, paddingBottom: 120 }]}
        data={loaded ? items : Array.from({ length: cols * 2 }, (_, i) => ({ id: `sk${i}`, skeleton: true }))}
        numColumns={cols}
        columnWrapperStyle={{ gap: 18 }}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 28 }} />}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1 / cols }}>
            {item.skeleton ? <GridCardSkeleton /> : (
              <GridCard item={item} index={index} onPress={() => navigation.navigate('ItemDetail', { id: item.id })} />
            )}
          </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const makeStyles = (c) => ({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 20,
    backgroundColor: c.card, borderRadius: 999, borderWidth: 1, borderColor: c.divider,
    boxShadow: '0 3px 12px rgba(0,0,0,0.08)',
  },
  searchInput: {
    flex: 1, height: '100%', fontFamily: font.semibold, fontSize: 15, color: c.text,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  avatar: { borderRadius: 999 },
  catBar: { marginTop: 18, marginHorizontal: -20, borderBottomWidth: 1, borderBottomColor: c.divider },
  catContent: { paddingHorizontal: 20, gap: 26 },
  cat: { alignItems: 'center', paddingTop: 6, opacity: 0.75, minWidth: 52 },
  catLabel: { fontFamily: font.medium, fontSize: 12, color: c.muted, marginTop: 6, marginBottom: 10 },
  underline: { height: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: 'transparent' },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  types: { flexDirection: 'row', gap: 8 },
  type: { height: 34, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  typeActive: { backgroundColor: c.text, borderColor: c.text },
  typeText: { fontFamily: font.semibold, fontSize: 13, color: c.text },
  count: { fontFamily: font.regular, fontSize: 13, color: c.muted },
  heading: { fontFamily: font.bold, fontSize: 22, color: c.text, letterSpacing: -0.4, marginTop: 26 },
  sub: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 4, marginBottom: 18 },
});

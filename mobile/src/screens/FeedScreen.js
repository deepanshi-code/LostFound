import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { categoryMeta } from '../config';
import GridCard, { GridCardSkeleton } from '../GridCard';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, CategorySheet, Chip, EmptyState, ErrorText, PropChip, Toggle, useUi } from '../ui';

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
  const [picker, setPicker] = useState(false);
  const searchRef = useRef(null);

  // On the web, press / to jump to search (like Linear)
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const cat = category ? categoryMeta(category) : null;
  const header = (
    <View style={{ paddingTop: insets.top + 14 }}>
      <View style={s.topRow}>
        <Text style={s.brand}>Campus Lost & Found</Text>
        <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile" style={s.avatar}>
          <Avatar name={user.name} size={32} />
        </Pressable>
      </View>

      <View style={s.search}>
        <Ionicons name="search" size={16} color={c.faint} />
        <TextInput
          ref={searchRef} value={query} onChangeText={setQuery} placeholder="Search items or places" placeholderTextColor={c.faint}
          returnKeyType="search" style={s.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={c.faint} />
          </Pressable>
        ) : Platform.OS === 'web' ? <Text style={s.kbd}>/</Text> : null}
      </View>

      <View style={s.filters}>
        <Toggle
          value={type} onChange={setType}
          options={[{ value: 'all', label: 'All' }, { value: 'lost', label: 'Lost', dot: c.lost }, { value: 'found', label: 'Found', dot: c.found }]}
        />
        <PropChip
          icon={cat ? cat.icon : 'pricetag-outline'} iconColor={cat?.color} value={category} placeholder="Category"
          onPress={() => setPicker(true)} onClear={() => setCategory(null)}
        />
      </View>

      {stats && !filtered ? (
        <View style={s.stats}>
          <Stat s={s} color={c.lost} value={stats.lost_open} label="still lost" />
          <Stat s={s} color={c.found} value={stats.found_open} label="waiting for owner" />
          <Stat s={s} color={c.faint} value={stats.reunited} label="returned" />
        </View>
      ) : null}

      <View style={s.headingRow}>
        <Text style={s.heading}>{filtered ? 'Results' : 'Recently reported'}</Text>
        {loaded ? <Text style={s.count}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text> : null}
      </View>
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
        columnWrapperStyle={{ gap: 14 }}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
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
      <CategorySheet visible={picker} onClose={() => setPicker(false)} value={category} onPick={setCategory} />
    </View>
  );
}

function Stat({ value, label, color, s }) {
  return (
    <View style={s.stat}>
      <View style={[s.statDot, { backgroundColor: color }]} />
      <Text style={s.statText}><Text style={s.statValue}>{value}</Text> {label}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  brand: { fontFamily: font.bold, fontSize: 17, color: c.text, letterSpacing: -0.4 },
  avatar: { borderRadius: 999 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14,
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.divider,
  },
  searchInput: {
    flex: 1, height: '100%', fontFamily: font.medium, fontSize: 14, color: c.text,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  kbd: {
    fontFamily: font.semibold, fontSize: 11, color: c.faint, borderWidth: 1, borderColor: c.border,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1,
  },
  filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6, marginTop: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: { fontFamily: font.regular, fontSize: 13, color: c.faint },
  statValue: { fontFamily: font.semibold, color: c.text },
  headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 14 },
  heading: { fontFamily: font.bold, fontSize: 15, color: c.text, letterSpacing: -0.2 },
  count: { fontFamily: font.medium, fontSize: 13, color: c.faint },
});

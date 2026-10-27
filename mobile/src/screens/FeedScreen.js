import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES } from '../config';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, Chip, EmptyState, ErrorText, Field, ScreenHeader, Segmented, SectionTitle, useUi } from '../ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();

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

  const header = (
    <View>
      <ScreenHeader
        subtitle={`${greeting()}, ${user.name.split(' ')[0]}`}
        title="Lost & Found"
        right={
          <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile">
            <Avatar name={user.name} size={38} />
          </Pressable>
        }
      />

      {stats ? (
        <View style={s.stats}>
          <Stat value={stats.lost_open} label="Lost" s={s} />
          <View style={s.statDivider} />
          <Stat value={stats.found_open} label="Found" s={s} />
          <View style={s.statDivider} />
          <Stat value={stats.reunited} label="Returned" s={s} />
        </View>
      ) : null}

      <Field
        icon="search-outline" value={query} onChangeText={setQuery}
        placeholder="Search items, places…" returnKeyType="search" style={{ marginBottom: 12 }}
      />
      <Segmented
        options={[{ value: 'all', label: 'All' }, { value: 'lost', label: 'Lost' }, { value: 'found', label: 'Found' }]}
        value={type}
        onChange={setType}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 20 }}>
        <Chip label="All categories" selected={!category} onPress={() => setCategory(null)} />
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.name} label={cat.name} icon={cat.icon} selected={category === cat.name}
            onPress={() => setCategory(category === cat.name ? null : cat.name)}
          />
        ))}
      </ScrollView>

      <SectionTitle
        style={{ marginTop: 16, marginBottom: 2 }}
        right={loaded ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : null}
      >
        {filtered ? 'Results' : 'Recent'}
      </SectionTitle>
      <ErrorText>{error}</ErrorText>
    </View>
  );

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={ui.content}
      data={items}
      keyExtractor={(i) => String(i.id)}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={[ui.divider, { marginLeft: 82 }]} />}
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function Stat({ value, label, s }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  stats: {
    flexDirection: 'row', borderWidth: 1, borderColor: c.border, borderRadius: 14,
    paddingVertical: 14, marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: font.bold, fontSize: 20, color: c.text, letterSpacing: -0.4 },
  statLabel: { fontFamily: font.regular, fontSize: 12, color: c.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: c.divider },
  chips: { marginTop: 14, marginHorizontal: -20 },
});

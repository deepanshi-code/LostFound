import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import { Banner, EmptyState, ErrorText, ScreenHeader, Segmented, StatusPill, Thumb, timeAgo, useUi } from '../ui';

export default function ActivityScreen({ navigation }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, sent] = await Promise.all([api('/items/mine'), api('/claims/mine')]);
      setPosts(mine.items);
      setClaims(sent.claims);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (id) => navigation.navigate('ItemDetail', { id });
  const pendingTotal = posts.reduce((n, p) => n + (p.pending_claims || 0), 0);

  const header = (
    <View style={{ marginBottom: 4 }}>
      <ScreenHeader title="Activity" />
      {pendingTotal ? (
        <Banner tone="warn">
          {pendingTotal} {pendingTotal > 1 ? 'responses are' : 'response is'} waiting for your review
        </Banner>
      ) : null}
      <Segmented
        options={[
          { value: 'posts', label: `My posts  ${posts.length}` },
          { value: 'claims', label: `My responses  ${claims.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={{ height: 8 }} />
      <ErrorText>{error}</ErrorText>
    </View>
  );

  const common = {
    style: ui.screen,
    contentContainerStyle: ui.content,
    ListHeaderComponent: header,
    ItemSeparatorComponent: () => <View style={[ui.divider, { marginLeft: 82 }]} />,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />,
  };

  if (tab === 'posts') {
    return (
      <FlatList
        {...common}
        data={posts}
        keyExtractor={(i) => `p${i.id}`}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => open(item.id)}
            footer={item.pending_claims ? (
              <Text style={s.pending}>{item.pending_claims} new {item.pending_claims > 1 ? 'responses' : 'response'}</Text>
            ) : null}
          />
        )}
        ListEmptyComponent={loaded ? (
          <EmptyState icon="document-text-outline" title="No posts yet" subtitle="Items you report as lost or found will show up here." />
        ) : null}
      />
    );
  }

  return (
    <FlatList
      {...common}
      data={claims}
      keyExtractor={(cl) => `c${cl.id}`}
      renderItem={({ item: cl }) => (
        <Pressable onPress={() => open(cl.item_id)} style={({ pressed, hovered }) => [s.row, (pressed || hovered) && { backgroundColor: c.surface }]}>
          <Thumb category={cl.item_category} size={68} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.top}>
              <Text style={s.title} numberOfLines={1}>{cl.item_title}</Text>
              <Text style={s.time}>{timeAgo(cl.created_at)}</Text>
            </View>
            <Text style={s.meta} numberOfLines={1}>To {cl.poster_name}</Text>
            <View style={{ marginTop: 8 }}><StatusPill status={cl.status} /></View>
            {cl.status === 'approved' ? (
              <Text style={s.contact} numberOfLines={1}>{cl.poster_email}{cl.poster_phone ? `  ·  ${cl.poster_phone}` : ''}</Text>
            ) : null}
          </View>
        </Pressable>
      )}
      ListEmptyComponent={loaded ? (
        <EmptyState icon="chatbubble-ellipses-outline" title="No responses yet" subtitle="When you claim an item or tell an owner you found theirs, it shows up here." />
      ) : null}
    />
  );
}

const makeStyles = (c) => ({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 12 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: c.text },
  time: { fontFamily: font.regular, fontSize: 12, color: c.faint },
  meta: { fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 4 },
  contact: { fontFamily: font.medium, fontSize: 13, color: c.primary, marginTop: 8 },
  pending: { fontFamily: font.semibold, fontSize: 12, color: c.warn, marginTop: 6 },
});

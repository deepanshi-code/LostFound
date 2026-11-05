import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import { EmptyState, ErrorText, ScreenHeader, Skeleton, SpringPress, StatusPill, Thumb, timeAgo, Toggle, useUi } from '../ui';

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
    <View>
      <ScreenHeader title="Activity" />
      {pendingTotal ? (
        <Pressable onPress={() => setTab('posts')} style={({ hovered }) => [ui.panel, s.alert, hovered && { borderColor: c.border }]}>
          <View style={s.alertDot} />
          <Text style={s.alertTitle}>{pendingTotal} {pendingTotal > 1 ? 'responses need' : 'response needs'} your review</Text>
          <Text style={s.alertSub}>Open a post to decide</Text>
        </Pressable>
      ) : null}
      <Toggle
        value={tab} onChange={setTab} style={{ marginBottom: 8 }}
        options={[
          { value: 'posts', label: 'My posts', count: loaded ? posts.length : null },
          { value: 'claims', label: 'My responses', count: loaded ? claims.length : null },
        ]}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );

  const common = {
    style: [ui.screen, { backgroundColor: c.bg }],
    contentContainerStyle: [ui.content, { paddingBottom: 120 }],
    ListHeaderComponent: header,
    ItemSeparatorComponent: () => <View style={s.sep} />,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />,
  };

  const skeletons = !loaded ? (
    <View style={{ gap: 20, paddingTop: 14 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
          <Skeleton width={52} height={52} radius={10} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  ) : null;

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
              <Text style={s.pending}>{item.pending_claims} to review</Text>
            ) : null}
          />
        )}
        ListEmptyComponent={loaded ? (
          <EmptyState icon="document-text-outline" title="No posts yet" subtitle="Items you report as lost or found will show up here." />
        ) : skeletons}
      />
    );
  }

  return (
    <FlatList
      {...common}
      data={claims}
      keyExtractor={(cl) => `c${cl.id}`}
      renderItem={({ item: cl }) => (
        <SpringPress onPress={() => open(cl.item_id)} scaleTo={0.985} style={s.row}>
          <Thumb category={cl.item_category} size={52} radius={10} />
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={s.title} numberOfLines={1}>{cl.item_title}</Text>
            <Text style={s.meta} numberOfLines={1}>To {cl.poster_name} · {timeAgo(cl.created_at)}</Text>
            {cl.status === 'approved' ? (
              <Text style={s.contact} numberOfLines={1}>{cl.poster_email}{cl.poster_phone ? `  ·  ${cl.poster_phone}` : ''}</Text>
            ) : null}
          </View>
          <StatusPill status={cl.status} />
        </SpringPress>
      )}
      ListEmptyComponent={loaded ? (
        <EmptyState icon="chatbubble-ellipses-outline" title="No responses yet" subtitle="When you claim an item or tell an owner you found theirs, it shows up here." />
      ) : skeletons}
    />
  );
}

const makeStyles = (c) => ({
  alert: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.warn },
  alertTitle: { fontFamily: font.semibold, fontSize: 14, color: c.text },
  alertSub: { fontFamily: font.regular, fontSize: 13, color: c.faint },
  sep: { height: 1, backgroundColor: c.divider, marginLeft: 66 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  title: { fontFamily: font.semibold, fontSize: 15, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: c.faint, marginTop: 2 },
  contact: { fontFamily: font.semibold, fontSize: 13, color: c.primary, marginTop: 6 },
  pending: { fontFamily: font.semibold, fontSize: 12, color: c.warn, marginTop: 4 },
});

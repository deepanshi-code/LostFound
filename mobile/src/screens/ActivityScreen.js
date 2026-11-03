import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import { EmptyState, ErrorText, ScreenHeader, Skeleton, SpringPress, StatusPill, Thumb, timeAgo, useUi } from '../ui';

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
        <Pressable onPress={() => setTab('posts')} style={s.alert}>
          <View style={s.alertIcon}><Ionicons name="notifications" size={18} color={c.bg} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{pendingTotal} {pendingTotal > 1 ? 'responses need' : 'response needs'} your review</Text>
            <Text style={s.alertSub}>Open the post to approve or decline</Text>
          </View>
        </Pressable>
      ) : null}
      <View style={s.tabs}>
        {[['posts', 'My posts', posts.length], ['claims', 'My responses', claims.length]].map(([value, label, n]) => {
          const active = tab === value;
          return (
            <Pressable key={value} onPress={() => setTab(value)} style={s.tab}>
              <Text style={[s.tabText, active && { color: c.text }]}>{label}{loaded ? ` (${n})` : ''}</Text>
              <View style={[s.tabLine, active && { backgroundColor: c.text }]} />
            </Pressable>
          );
        })}
      </View>
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
        <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
          <Skeleton width={76} height={76} radius={14} />
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
              <Text style={s.pending}>{item.pending_claims} new {item.pending_claims > 1 ? 'responses' : 'response'}</Text>
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
          <Thumb category={cl.item_category} size={76} radius={14} />
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={s.title} numberOfLines={1}>{cl.item_title}</Text>
            <Text style={s.meta} numberOfLines={1}>To {cl.poster_name} · {timeAgo(cl.created_at)}</Text>
            <View style={{ marginTop: 8 }}><StatusPill status={cl.status} /></View>
            {cl.status === 'approved' ? (
              <Text style={s.contact} numberOfLines={1}>{cl.poster_email}{cl.poster_phone ? `  ·  ${cl.poster_phone}` : ''}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.faint} style={{ alignSelf: 'center' }} />
        </SpringPress>
      )}
      ListEmptyComponent={loaded ? (
        <EmptyState icon="chatbubble-ellipses-outline" title="No responses yet" subtitle="When you claim an item or tell an owner you found theirs, it shows up here." />
      ) : skeletons}
    />
  );
}

const makeStyles = (c) => ({
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: c.divider, marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontFamily: font.semibold, fontSize: 15, color: c.text },
  alertSub: { fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 28, borderBottomWidth: 1, borderBottomColor: c.divider, marginBottom: 6 },
  tab: { paddingTop: 4 },
  tabText: { fontFamily: font.semibold, fontSize: 15, color: c.muted, marginBottom: 12 },
  tabLine: { height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  sep: { height: 1, backgroundColor: c.divider, marginLeft: 92 },
  row: { flexDirection: 'row', gap: 16, paddingVertical: 14 },
  title: { fontFamily: font.semibold, fontSize: 16, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 3 },
  contact: { fontFamily: font.semibold, fontSize: 13, color: c.primary, marginTop: 8 },
  pending: { fontFamily: font.semibold, fontSize: 13, color: c.warn, marginTop: 6 },
});

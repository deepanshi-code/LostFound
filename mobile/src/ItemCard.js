import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './api';
import { font, useStyles, useTheme } from './theme';
import { SpringPress, Thumb, timeAgo } from './ui';

const LABEL = { lost: 'Lost', found: 'Found', resolved: 'Returned' };

// One item as a list row (Activity): photo, title, place, status. Lists draw the dividers.
export default function ItemCard({ item, onPress, footer }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;
  const dot = status === 'lost' ? c.lost : status === 'found' ? c.found : c.faint;

  return (
    <SpringPress onPress={onPress} scaleTo={0.985} style={s.row}>
      <Thumb category={item.category} uri={imageUrl(item.image_url)} size={76} radius={14} />
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <Text style={s.meta} numberOfLines={1}>{item.location} · {timeAgo(item.created_at)}</Text>
        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: dot }]} />
          <Text style={s.status}>{LABEL[status]}</Text>
          {item.match_score ? <Text style={s.match}>· {Math.round(item.match_score * 100)}% match</Text> : null}
        </View>
        {footer}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.faint} style={{ alignSelf: 'center' }} />
    </SpringPress>
  );
}

const makeStyles = (c) => ({
  row: { flexDirection: 'row', gap: 16, paddingVertical: 14 },
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontFamily: font.semibold, fontSize: 16, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontFamily: font.semibold, fontSize: 13, color: c.text },
  match: { fontFamily: font.semibold, fontSize: 13, color: c.primary },
});

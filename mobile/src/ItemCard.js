import { Text, View } from 'react-native';
import { imageUrl } from './api';
import { font, useStyles, useTheme } from './theme';
import { SpringPress, Thumb, timeAgo } from './ui';

const LABEL = { lost: 'Lost', found: 'Found', resolved: 'Returned' };

// One item as a compact list row (Activity): photo, title, place and time, status on the right
export default function ItemCard({ item, onPress, footer }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;
  const dot = status === 'lost' ? c.lost : status === 'found' ? c.found : c.faint;

  return (
    <SpringPress onPress={onPress} scaleTo={0.985} style={s.row}>
      <Thumb category={item.category} uri={imageUrl(item.image_url)} size={52} radius={10} />
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <Text style={s.meta} numberOfLines={1}>{item.location} · {timeAgo(item.created_at)}</Text>
        {footer}
      </View>
      <View style={s.status}>
        <View style={[s.dot, { backgroundColor: dot }]} />
        <Text style={s.statusText}>{LABEL[status]}</Text>
      </View>
    </SpringPress>
  );
}

const makeStyles = (c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.semibold, fontSize: 15, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: c.faint, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: font.medium, fontSize: 12, color: c.muted },
});

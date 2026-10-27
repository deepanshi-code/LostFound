import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './api';
import { font, useStyles, useTheme } from './theme';
import { StatusPill, Thumb, timeAgo } from './ui';

// One item in a list: thumbnail, title, place and time, status. Lists draw the dividers.
export default function ItemCard({ item, onPress, footer }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;

  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }) => [s.row, (pressed || hovered) && { backgroundColor: c.surface }]}>
      <Thumb category={item.category} uri={imageUrl(item.image_url)} size={68} />
      <View style={s.body}>
        <View style={s.top}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          <Text style={s.time}>{timeAgo(item.created_at)}</Text>
        </View>
        <View style={s.meta}>
          <Ionicons name="location-outline" size={14} color={c.faint} />
          <Text style={s.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={s.bottom}>
          <StatusPill status={status} />
          {item.match_score ? (
            <Text style={s.match}>{Math.round(item.match_score * 100)}% match</Text>
          ) : (
            <Text style={s.category} numberOfLines={1}>{item.category}</Text>
          )}
        </View>
        {footer}
      </View>
    </Pressable>
  );
}

const makeStyles = (c) => ({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 12 },
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: c.text },
  time: { fontFamily: font.regular, fontSize: 12, color: c.faint },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { flex: 1, fontFamily: font.regular, fontSize: 13, color: c.muted },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  category: { fontFamily: font.regular, fontSize: 12, color: c.faint, flex: 1 },
  match: { fontFamily: font.semibold, fontSize: 12, color: c.primary },
});

import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './api';
import { font, softShadow, useStyles, useTheme } from './theme';
import { StatusPill, Thumb, timeAgo } from './ui';

// One item as a soft card: photo, title, place and time, status. Lists add the spacing.
export default function ItemCard({ item, onPress, footer }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;

  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }) => [s.card, (pressed || hovered) && s.cardHover]}>
      <Thumb category={item.category} uri={imageUrl(item.image_url)} size={76} radius={14} />
      <View style={s.body}>
        <View style={s.top}>
          <StatusPill status={status} />
          <Text style={s.time}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <View style={s.meta}>
          <Ionicons name="location-outline" size={14} color={c.faint} />
          <Text style={s.metaText} numberOfLines={1}>{item.location}</Text>
          {item.match_score ? (
            <Text style={s.match}>{Math.round(item.match_score * 100)}% match</Text>
          ) : (
            <Text style={s.category} numberOfLines={1}>· {item.category}</Text>
          )}
        </View>
        {footer}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.faint} style={{ alignSelf: 'center' }} />
    </Pressable>
  );
}

const makeStyles = (c) => ({
  card: {
    flexDirection: 'row', gap: 14, padding: 12, borderRadius: 20, backgroundColor: c.card,
    borderWidth: 1, borderColor: c.divider, ...softShadow(c, 6, 20),
  },
  cardHover: { borderColor: c.primarySoft, ...softShadow(c, 12, 28), transform: [{ translateY: -1 }] },
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontFamily: font.bold, fontSize: 16, color: c.text, marginTop: 7, letterSpacing: -0.2 },
  time: { fontFamily: font.medium, fontSize: 12, color: c.faint },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: c.muted },
  category: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: c.faint },
  match: { fontFamily: font.bold, fontSize: 12, color: c.primary, marginLeft: 6 },
});

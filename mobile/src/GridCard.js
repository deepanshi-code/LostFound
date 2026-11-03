import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './api';
import { font, softShadow, useStyles, useTheme } from './theme';
import { StatusPill, Thumb, timeAgo } from './ui';

// Photo-first card for the home grid. `index` staggers the fade-in a little.
export default function GridCard({ item, onPress, index = 0 }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const appear = useRef(new Animated.Value(0)).current;
  const status = item.status === 'resolved' ? 'resolved' : item.type;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 360, delay: Math.min(index, 8) * 45, useNativeDriver: false }).start();
  }, [appear, index]);

  return (
    <Animated.View style={[s.wrap, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      <Pressable onPress={onPress} style={({ pressed, hovered }) => [s.card, hovered && s.hover, pressed && { transform: [{ scale: 0.98 }] }]}>
        <View>
          <Thumb category={item.category} uri={imageUrl(item.image_url)} square radius={0} iconSize={44} />
          <View style={s.pill}><StatusPill status={status} /></View>
          {item.match_score ? <Text style={s.match}>{Math.round(item.match_score * 100)}% match</Text> : null}
        </View>
        <View style={s.body}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <View style={s.meta}>
            <Ionicons name="location-outline" size={13} color={c.faint} />
            <Text style={s.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
          <Text style={s.time}>{timeAgo(item.created_at)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c) => ({
  wrap: { flex: 1 },
  card: { flex: 1, backgroundColor: c.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: c.divider, ...softShadow(c, 8, 24) },
  hover: { borderColor: c.primarySoft, ...softShadow(c, 14, 30), transform: [{ translateY: -2 }] },
  pill: { position: 'absolute', top: 10, left: 10, borderRadius: 999, backgroundColor: c.card, padding: 2, ...softShadow(c, 2, 6) },
  match: {
    position: 'absolute', bottom: 10, right: 10, backgroundColor: c.primary, color: '#fff', fontFamily: font.bold,
    fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden',
  },
  body: { padding: 12, paddingTop: 10, gap: 4 },
  title: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: c.text, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { flex: 1, fontFamily: font.regular, fontSize: 12, color: c.muted },
  time: { fontFamily: font.medium, fontSize: 11, color: c.faint },
});

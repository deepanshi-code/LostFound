import { useEffect, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { imageUrl } from './api';
import { categoryMeta } from './config';
import { font, useStyles, useTheme } from './theme';
import { Skeleton, SpringPress, Thumb, timeAgo } from './ui';

const LABEL = { lost: 'Lost', found: 'Found', resolved: 'Returned' };

// Photo-first card (Airbnb style): rounded photo, small white label, plain text below.
export default function GridCard({ item, onPress, index = 0 }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;
  const appear = useRef(new Animated.Value(0)).current;
  const uri = imageUrl(item.image_url);

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 420, delay: Math.min(index, 8) * 50, useNativeDriver: false }).start();
  }, [appear, index]);

  return (
    <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      <SpringPress onPress={onPress} accessibilityRole="button" accessibilityLabel={`${LABEL[status]}: ${item.title}`}>
        <View style={s.photoBox}>
          {uri ? (
            // No load-based fade: onLoad doesn't reliably fire on web, which left photos invisible
            <Image source={{ uri }} style={s.photo} />
          ) : (
            <Thumb category={item.category} square radius={0} iconSize={40} />
          )}
          <View style={s.label}>
            <View style={[s.dot, { backgroundColor: status === 'lost' ? c.lost : status === 'found' ? c.found : c.faint }]} />
            <Text style={s.labelText}>{LABEL[status]}</Text>
          </View>
          {item.match_score ? <Text style={s.match}>{Math.round(item.match_score * 100)}% match</Text> : null}
        </View>
        <View style={s.text}>
          <View style={s.row}>
            <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={s.meta} numberOfLines={1}>{item.location}</Text>
          <Text style={s.meta} numberOfLines={1}>{categoryMeta(item.category).name} · {timeAgo(item.created_at)}</Text>
        </View>
      </SpringPress>
    </Animated.View>
  );
}

// Same shape while loading
export function GridCardSkeleton() {
  return (
    <View>
      <Skeleton height={null} radius={18} style={{ aspectRatio: 1 }} />
      <Skeleton width="75%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const makeStyles = (c) => ({
  photoBox: { borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface },
  photo: { width: '100%', aspectRatio: 1 },
  label: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.glass, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  labelText: { fontFamily: font.bold, fontSize: 12, color: c.text },
  match: {
    position: 'absolute', bottom: 10, left: 10, backgroundColor: c.glass, color: c.text, fontFamily: font.bold,
    fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden',
  },
  text: { paddingTop: 10, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 14, color: c.muted },
});

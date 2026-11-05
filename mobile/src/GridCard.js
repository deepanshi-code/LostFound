import { useEffect, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './api';
import { categoryMeta } from './config';
import { font, tint, useStyles, useTheme } from './theme';
import { Skeleton, SpringPress, timeAgo } from './ui';

const LABEL = { lost: 'Lost', found: 'Found', resolved: 'Returned' };

// Photo-first card: rounded photo with a small status label, then a title and one quiet line.
export default function GridCard({ item, onPress, index = 0 }) {
  const { colors: c, isDark } = useTheme();
  const s = useStyles(makeStyles);
  const status = item.status === 'resolved' ? 'resolved' : item.type;
  const appear = useRef(new Animated.Value(0)).current;
  const uri = imageUrl(item.image_url);
  const meta = categoryMeta(item.category);

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
            <View style={s.noPhoto}>
              <View style={[s.noPhotoIcon, { backgroundColor: tint(meta.color, isDark) }]}>
                <Ionicons name={meta.icon} size={24} color={meta.color} />
              </View>
            </View>
          )}
          <View style={s.label}>
            <View style={[s.dot, { backgroundColor: status === 'lost' ? c.lost : status === 'found' ? c.found : c.faint }]} />
            <Text style={s.labelText}>{LABEL[status]}</Text>
          </View>
          {item.match_score ? <Text style={s.match}>{Math.round(item.match_score * 100)}% match</Text> : null}
        </View>
        <View style={s.text}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          <Text style={s.meta} numberOfLines={1}>{item.location} · {timeAgo(item.created_at)}</Text>
        </View>
      </SpringPress>
    </Animated.View>
  );
}

// Same shape while loading
export function GridCardSkeleton() {
  return (
    <View>
      <Skeleton height={null} radius={14} style={{ aspectRatio: 1 }} />
      <Skeleton width="75%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const makeStyles = (c) => ({
  photoBox: { borderRadius: 14, overflow: 'hidden', backgroundColor: c.surface },
  photo: { width: '100%', aspectRatio: 1 },
  noPhoto: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: c.divider, backgroundColor: c.card },
  noPhotoIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.glass, borderRadius: 7, paddingHorizontal: 7, height: 22,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  labelText: { fontFamily: font.semibold, fontSize: 11, color: c.text },
  match: {
    position: 'absolute', bottom: 8, left: 8, backgroundColor: c.glass, color: c.text, fontFamily: font.semibold,
    fontSize: 11, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden',
  },
  text: { paddingTop: 10, gap: 2 },
  title: { fontFamily: font.semibold, fontSize: 14, color: c.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: c.faint },
});

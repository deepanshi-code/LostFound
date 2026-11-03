import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { CATEGORIES } from '../config';
import { font, tint, useStyles, useTheme } from '../theme';
import { ScreenHeader, useUi } from '../ui';

// Browse by category: pastel tiles with how many open items each has
export default function ExploreScreen({ navigation }) {
  const { isDark, colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const { width } = useWindowDimensions();
  const cols = width >= 1000 ? 5 : width >= 700 ? 4 : 2;
  const [counts, setCounts] = useState({});

  useFocusEffect(useCallback(() => {
    api('/items').then(({ items }) => {
      const next = {};
      for (const i of items) next[i.category] = (next[i.category] || 0) + 1;
      setCounts(next);
    }).catch(() => {});
  }, []));

  const open = (category) => navigation.navigate('Browse', { category, t: Date.now() });

  return (
      <ScrollView style={[ui.screen, { backgroundColor: c.bg }]} contentContainerStyle={[ui.content, { maxWidth: 1000, paddingBottom: 110 }]}>
        <ScreenHeader title="Explore" subtitle="Browse by category" />
        <View style={s.grid}>
          {CATEGORIES.map((cat) => {
            const n = counts[cat.name] || 0;
            return (
              <Pressable
                key={cat.name}
                onPress={() => open(cat.name)}
                style={({ pressed, hovered }) => [s.tile, { width: `${100 / cols - 4}%` }, hovered && s.hover, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <View style={[s.icon, { backgroundColor: tint(cat.color, isDark) }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={s.name} numberOfLines={2}>{cat.name}</Text>
                <Text style={[s.count, n > 0 && { color: cat.color }]}>{n === 0 ? 'Nothing yet' : `${n} open`}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
  );
}

const makeStyles = (c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  tile: {
    flexGrow: 1, backgroundColor: c.card, borderRadius: 16, padding: 16, alignItems: 'flex-start',
    borderWidth: 1, borderColor: c.border, minHeight: 122,
  },
  hover: { borderColor: c.text },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontFamily: font.semibold, fontSize: 14, color: c.text, lineHeight: 18 },
  count: { fontFamily: font.medium, fontSize: 11, color: c.faint, marginTop: 4 },
});

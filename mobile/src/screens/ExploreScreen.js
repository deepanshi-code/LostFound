import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { CATEGORIES } from '../config';
import { font, tint, useStyles, useTheme } from '../theme';
import { ScreenHeader, useUi } from '../ui';

// Browse by category: a compact list, categories with open items first
export default function ExploreScreen({ navigation }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const twoCols = width >= 760;
  const [counts, setCounts] = useState({});

  useFocusEffect(useCallback(() => {
    api('/items').then(({ items }) => {
      const next = {};
      for (const i of items) next[i.category] = (next[i.category] || 0) + 1;
      setCounts(next);
    }).catch(() => {});
  }, []));

  const open = (category) => navigation.navigate('Browse', { category, t: Date.now() });
  const active = CATEGORIES.filter((cat) => counts[cat.name]);
  const quiet = CATEGORIES.filter((cat) => !counts[cat.name]);
  const total = active.reduce((n, cat) => n + counts[cat.name], 0);

  return (
    <ScrollView style={[ui.screen, { backgroundColor: c.bg }]} contentContainerStyle={[ui.content, { maxWidth: 960, paddingBottom: 110 }]}>
      <ScreenHeader title="Explore" subtitle={total ? `${total} open ${total === 1 ? 'item' : 'items'} in ${active.length} ${active.length === 1 ? 'category' : 'categories'}` : 'Browse by category'} />
      {active.length ? (
        <>
          <Text style={[ui.section, { marginTop: 0 }]}>With open items</Text>
          <Group items={active} counts={counts} onOpen={open} twoCols={twoCols} s={s} ui={ui} />
        </>
      ) : null}
      <Text style={[ui.section, !active.length && { marginTop: 0 }]}>{active.length ? 'Everything else' : 'All categories'}</Text>
      <Group items={quiet} counts={counts} onOpen={open} twoCols={twoCols} s={s} ui={ui} />
    </ScrollView>
  );
}

function Group({ items, counts, onOpen, twoCols, s, ui }) {
  const { colors: c, isDark } = useTheme();
  return (
    <View style={[ui.panel, twoCols && s.twoCols]}>
      {items.map((cat, i) => {
        const n = counts[cat.name] || 0;
        // In two columns, every row but the last pair gets a divider
        const last = twoCols ? i >= items.length - (items.length % 2 || 2) : i === items.length - 1;
        return (
          <Pressable
            key={cat.name}
            onPress={() => onOpen(cat.name)}
            style={({ hovered, pressed }) => [ui.panelRow, !last && ui.panelBorder, twoCols && { width: '50%' }, (hovered || pressed) && { backgroundColor: c.surface }]}
          >
            <View style={[s.icon, { backgroundColor: tint(cat.color, isDark) }]}>
              <Ionicons name={cat.icon} size={16} color={cat.color} />
            </View>
            <Text style={s.name} numberOfLines={1}>{cat.name}</Text>
            {n ? <Text style={s.count}>{n}</Text> : null}
            <Ionicons name="chevron-forward" size={15} color={c.faint} />
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c) => ({
  twoCols: { flexDirection: 'row', flexWrap: 'wrap' },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: font.medium, fontSize: 14, color: c.text },
  count: { fontFamily: font.semibold, fontSize: 13, color: c.muted },
});

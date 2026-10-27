import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, ListRow, ScreenHeader, SectionTitle, Segmented, useUi } from '../ui';

const STEPS = [
  ['add-circle-outline', 'Report what you lost or found, with a photo if you can.'],
  ['sparkles-outline', 'Similar reports are suggested as possible matches.'],
  ['chatbubble-ellipses-outline', 'Reply to a post. Owners describe a detail that isn\'t shown.'],
  ['shield-checkmark-outline', 'Email and phone are shared only after the poster approves.'],
  ['checkmark-circle-outline', 'Meet somewhere public on campus, then mark it returned.'],
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const [stats, setStats] = useState(null);

  useFocusEffect(useCallback(() => {
    Promise.all([api('/items/mine'), api('/claims/mine')])
      .then(([mine, sent]) => setStats({
        posts: mine.items.length,
        returned: mine.items.filter((i) => i.status === 'resolved').length,
        responses: sent.claims.length,
      }))
      .catch(() => {});
  }, []));

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <ScreenHeader title="Profile" />

      <View style={s.account}>
        <Avatar name={user.name} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={ui.muted} numberOfLines={1}>{user.email}</Text>
          {user.phone ? <Text style={ui.muted}>{user.phone}</Text> : null}
        </View>
      </View>

      <View style={s.stats}>
        <Stat value={stats?.posts} label="Posts" s={s} />
        <View style={s.statDivider} />
        <Stat value={stats?.returned} label="Returned" s={s} />
        <View style={s.statDivider} />
        <Stat value={stats?.responses} label="Responses" s={s} />
      </View>

      <SectionTitle>Appearance</SectionTitle>
      <Segmented
        options={[
          { value: 'light', label: 'Light', icon: 'sunny-outline' },
          { value: 'dark', label: 'Dark', icon: 'moon-outline' },
          { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Text style={ui.hint}>System follows your device's light or dark setting.</Text>

      <SectionTitle>How it works</SectionTitle>
      <View style={ui.group}>
        {STEPS.map(([icon, text], i) => (
          <ListRow key={i} icon={icon} label={text} last={i === STEPS.length - 1} />
        ))}
      </View>

      <View style={[ui.group, { marginTop: 28 }]}>
        <ListRow icon="log-out-outline" label="Log out" onPress={signOut} danger last />
      </View>
      <Text style={[ui.hint, { textAlign: 'center', marginTop: 20 }]}>Connected to {API_URL}</Text>
    </ScrollView>
  );
}

function Stat({ value, label, s }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value ?? '–'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  account: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  name: { fontFamily: font.semibold, fontSize: 19, color: c.text, letterSpacing: -0.3, marginBottom: 2 },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: font.bold, fontSize: 20, color: c.text },
  statLabel: { fontFamily: font.regular, fontSize: 12, color: c.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: c.divider },
});

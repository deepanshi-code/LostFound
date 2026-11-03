import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, ScreenHeader, Segmented, useUi } from '../ui';

const STEPS = [
  ['add-circle-outline', 'Report it', 'Post what you lost or found, with a photo if you can.'],
  ['sparkles-outline', 'Get matched', 'Similar reports are suggested automatically.'],
  ['chatbubble-ellipses-outline', 'Prove it', 'Owners describe a detail that isn\'t shown in the post.'],
  ['shield-checkmark-outline', 'Stay private', 'Email and phone are shared only after approval.'],
  ['checkmark-circle-outline', 'Hand it over', 'Meet somewhere public on campus, then mark it returned.'],
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { mode, setMode, colors: c } = useTheme();
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
    <ScrollView style={[ui.screen, { backgroundColor: c.bg }]} contentContainerStyle={[ui.content, { paddingBottom: 120 }]}>
      <ScreenHeader title="Profile" />

      <View style={s.account}>
        <Avatar name={user.name} size={68} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.email} numberOfLines={1}>{user.email}</Text>
          {user.phone ? <Text style={s.email}>{user.phone}</Text> : null}
        </View>
      </View>

      <View style={s.stats}>
        <Stat value={stats?.posts} label="Posts" s={s} />
        <View style={s.statLine} />
        <Stat value={stats?.returned} label="Returned" s={s} />
        <View style={s.statLine} />
        <Stat value={stats?.responses} label="Responses" s={s} />
      </View>

      <Text style={s.section}>Settings</Text>
      <View style={s.settingRow}>
        <Ionicons name="contrast-outline" size={24} color={c.text} />
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>Appearance</Text>
          <Text style={s.rowSub}>System follows your device's setting</Text>
        </View>
      </View>
      <Segmented
        options={[
          { value: 'light', label: 'Light', icon: 'sunny-outline' },
          { value: 'dark', label: 'Dark', icon: 'moon-outline' },
          { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <View style={s.divider} />
      <Text style={s.section}>How it works</Text>
      {STEPS.map(([icon, title, text]) => (
        <View key={title} style={s.step}>
          <Ionicons name={icon} size={24} color={c.text} />
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>{title}</Text>
            <Text style={s.rowSub}>{text}</Text>
          </View>
        </View>
      ))}

      <View style={s.divider} />
      <Pressable onPress={signOut} style={s.logout} hitSlop={8} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={22} color={c.text} />
        <Text style={s.logoutText}>Log out</Text>
      </Pressable>
      <Text style={[ui.hint, { marginTop: 28 }]}>Connected to {API_URL}</Text>
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
  account: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  name: { fontFamily: font.bold, fontSize: 22, color: c.text, letterSpacing: -0.4 },
  email: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  stats: {
    flexDirection: 'row', marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: c.divider,
    paddingVertical: 18, boxShadow: '0 6px 20px rgba(0,0,0,0.06)', backgroundColor: c.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: font.bold, fontSize: 24, color: c.text },
  statLabel: { fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  statLine: { width: 1, backgroundColor: c.divider },
  section: { fontFamily: font.bold, fontSize: 20, color: c.text, letterSpacing: -0.3, marginTop: 32, marginBottom: 18 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  rowTitle: { fontFamily: font.semibold, fontSize: 16, color: c.text },
  rowSub: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 2, lineHeight: 20 },
  divider: { height: 1, backgroundColor: c.divider, marginTop: 32 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, alignSelf: 'flex-start' },
  logoutText: { fontFamily: font.semibold, fontSize: 16, color: c.text, textDecorationLine: 'underline' },
});

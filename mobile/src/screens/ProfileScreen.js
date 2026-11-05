import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { font, useStyles, useTheme } from '../theme';
import { Avatar, ErrorText, ScreenHeader, Toggle, useUi } from '../ui';

const STEPS = [
  ['add-circle-outline', 'Report it', 'Post what you lost or found, with a photo if you can.'],
  ['sparkles-outline', 'Get matched', 'Similar reports are suggested automatically.'],
  ['chatbubble-ellipses-outline', 'Prove it', 'Owners describe a detail that isn\'t shown in the post.'],
  ['shield-checkmark-outline', 'Stay private', 'Email and phone are shared only after approval.'],
  ['checkmark-circle-outline', 'Hand it over', 'Meet somewhere public on campus, then mark it returned.'],
];

export default function ProfileScreen() {
  const { user, setUser, signOut } = useAuth();
  const { mode, setMode, colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // Flip the switch straight away, and put it back if the server says no
  const toggleEmails = async (on) => {
    setError('');
    setUser({ ...user, notify_email: on });
    try {
      const data = await api('/auth/me', { method: 'PATCH', body: { notify_email: on } });
      setUser(data.user);
    } catch (e) {
      setUser({ ...user, notify_email: !on });
      setError(e.message);
    }
  };

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
        <Avatar name={user.name} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.email} numberOfLines={1}>{user.email}{user.phone ? `  ·  ${user.phone}` : ''}</Text>
        </View>
      </View>

      <View style={[ui.panel, s.stats]}>
        <Stat value={stats?.posts} label="Posts" s={s} />
        <View style={s.statLine} />
        <Stat value={stats?.returned} label="Returned" s={s} />
        <View style={s.statLine} />
        <Stat value={stats?.responses} label="Responses" s={s} />
      </View>

      <Text style={ui.section}>Settings</Text>
      <View style={ui.panel}>
        <View style={[ui.panelRow, ui.panelBorder, s.wrapRow]}>
          <Ionicons name="contrast-outline" size={18} color={c.muted} />
          <Text style={s.rowTitle}>Appearance</Text>
          <Toggle
            value={mode} onChange={setMode}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          />
        </View>
        <View style={[ui.panelRow, { paddingVertical: 12 }]}>
          <Ionicons name="mail-unread-outline" size={18} color={c.muted} />
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>Email notifications</Text>
            <Text style={s.rowSub}>Responses, approvals and possible matches</Text>
          </View>
          <Switch
            value={user.notify_email !== false}
            onValueChange={toggleEmails}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#fff"
            activeThumbColor="#fff"
            accessibilityLabel="Email notifications"
          />
        </View>
      </View>
      <ErrorText>{error}</ErrorText>

      <Text style={ui.section}>How it works</Text>
      <View style={ui.panel}>
        {STEPS.map(([, title, text], i) => (
          <View key={title} style={[ui.panelRow, s.step, i < STEPS.length - 1 && ui.panelBorder]}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{title}</Text>
              <Text style={s.rowSub}>{text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[ui.panel, { marginTop: 30 }]}>
        <Pressable onPress={signOut} style={({ hovered }) => [ui.panelRow, hovered && { backgroundColor: c.surface }]} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color={c.danger} />
          <Text style={[s.rowTitle, { color: c.danger }]}>Log out</Text>
        </Pressable>
      </View>
      <Text style={[ui.hint, { marginTop: 20, color: c.faint }]}>Connected to {API_URL}</Text>
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
  account: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontFamily: font.bold, fontSize: 18, color: c.text, letterSpacing: -0.4 },
  email: { fontFamily: font.regular, fontSize: 13, color: c.faint, marginTop: 2 },
  stats: { flexDirection: 'row', marginTop: 20, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: font.bold, fontSize: 20, color: c.text },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: c.faint, marginTop: 2 },
  statLine: { width: 1, backgroundColor: c.divider },
  wrapRow: { flexWrap: 'wrap', paddingVertical: 10 },
  rowTitle: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: c.text },
  rowSub: { fontFamily: font.regular, fontSize: 13, color: c.faint, marginTop: 2, lineHeight: 18 },
  step: { alignItems: 'flex-start', paddingVertical: 12 },
  stepNum: { width: 22, height: 22, borderRadius: 6, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: font.bold, fontSize: 11, color: c.muted },
});

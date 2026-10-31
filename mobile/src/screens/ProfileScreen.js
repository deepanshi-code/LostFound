import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { BrandGradient, SkyBackground } from '../decor';
import { font, useStyles, useTheme } from '../theme';
import { ListRow, ScreenHeader, SectionTitle, Segmented, useUi } from '../ui';

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
    <SkyBackground>
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <ScreenHeader title="Profile" />

      <BrandGradient style={s.accountCard}>
        <View style={s.account}>
          <View style={s.avatar}><Text style={s.avatarText}>{user.name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user.name}</Text>
            <Text style={s.email} numberOfLines={1}>{user.email}</Text>
            {user.phone ? <Text style={s.email}>{user.phone}</Text> : null}
          </View>
        </View>
        <View style={s.stats}>
          <Stat value={stats?.posts} label="Posts" s={s} />
          <Stat value={stats?.returned} label="Returned" s={s} />
          <Stat value={stats?.responses} label="Responses" s={s} />
        </View>
      </BrandGradient>

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
    </SkyBackground>
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
  accountCard: { borderRadius: 28, padding: 20, boxShadow: `0 16px 36px ${c.primary}40` },
  account: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: font.bold, fontSize: 21, color: '#fff' },
  name: { fontFamily: font.extrabold, fontSize: 20, color: '#fff', letterSpacing: -0.4, marginBottom: 2 },
  email: { fontFamily: font.regular, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: {
    flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  statValue: { fontFamily: font.extrabold, fontSize: 20, color: '#fff' },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});

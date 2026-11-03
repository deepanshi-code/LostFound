import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import { CATEGORIES } from '../config';
import { font, tint, useStyles, useTheme } from '../theme';
import { Button, ErrorText, Field, ScreenHeader, useUi } from '../ui';

const localDate = (daysBack = 0) => {
  const d = new Date(Date.now() - daysBack * 86_400_000); // local date, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptyForm = (type = 'lost') => ({
  type, title: '', category: null, location: '', date_occurred: localDate(), description: '',
});

export default function PostScreen({ navigation, route }) {
  const { colors: c, isDark } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const catCols = width >= 700 ? 4 : 3;
  const [form, setForm] = useState(() => emptyForm(route.params?.type));
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Other screens can open this tab with a type already chosen
  useEffect(() => {
    if (route.params?.type) setForm((f) => ({ ...f, type: route.params.type }));
  }, [route.params?.type, route.params?.t]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const isLost = form.type === 'lost';

  async function pickPhoto(fromCamera) {
    const options = { mediaTypes: ['images'], quality: 0.6 };
    if (fromCamera) {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return setError('Camera permission is needed to take a photo');
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function submit() {
    setError('');
    if (!form.title.trim()) return setError('Give the item a short title');
    if (!form.category) return setError('Choose a category');
    if (!form.location.trim()) return setError(isLost ? 'Add where you lost it' : 'Add where you found it');

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (photo) {
      const name = photo.fileName || 'photo.jpg';
      if (Platform.OS === 'web') {
        // On web the picker gives a blob/data URI, so convert it to a real Blob
        data.append('image', await (await fetch(photo.uri)).blob(), name);
      } else {
        data.append('image', { uri: photo.uri, name, type: photo.mimeType || 'image/jpeg' });
      }
    }

    setBusy(true);
    try {
      const { item } = await api('/items', { method: 'POST', form: data });
      setForm(emptyForm(form.type));
      setPhoto(null);
      navigation.navigate('ItemDetail', { id: item.id, justPosted: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const dates = [['Today', 0], ['Yesterday', 1], ['2 days ago', 2]];
  const summary = form.category ? `${isLost ? 'Lost' : 'Found'} · ${form.category}` : isLost ? 'Something you lost' : 'Something you found';

  return (
    <View style={[ui.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[ui.content, { paddingBottom: 140 }]} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Report an item" subtitle="Takes about a minute" />

        <Text style={s.section}>What happened?</Text>
        <View style={s.choices}>
          {[
            ['lost', 'help-buoy-outline', 'I lost something', 'Ask the campus to look out for it'],
            ['found', 'hand-left-outline', 'I found something', 'Help it get back to its owner'],
          ].map(([value, icon, title, sub]) => {
            const active = form.type === value;
            return (
              <Pressable key={value} onPress={() => set('type')(value)} style={({ hovered }) => [s.choice, active && s.choiceActive, hovered && !active && { borderColor: c.text }]}>
                <Ionicons name={icon} size={28} color={c.text} />
                <Text style={s.choiceTitle}>{title}</Text>
                <Text style={s.choiceSub}>{sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.divider} />
        <Field
          label="What is it?" value={form.title} onChangeText={set('title')} maxLength={80}
          placeholder={isLost ? 'e.g. Black HP laptop charger' : 'e.g. Blue steel water bottle'}
        />

        <Text style={s.label}>Category</Text>
        <View style={s.grid}>
          {CATEGORIES.map((cat) => {
            const active = form.category === cat.name;
            return (
              <Pressable
                key={cat.name}
                onPress={() => set('category')(cat.name)}
                style={({ hovered }) => [s.tile, { width: `${100 / catCols - 3}%` }, active && s.tileActive, hovered && !active && { borderColor: c.text }]}
              >
                <View style={[s.tileIcon, { backgroundColor: tint(cat.color, isDark) }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <Text style={s.tileText} numberOfLines={2}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.divider} />
        <Field
          label={isLost ? 'Where did you lose it?' : 'Where did you find it?'} icon="location-outline"
          value={form.location} onChangeText={set('location')} placeholder="e.g. Library, 2nd floor"
        />

        <Text style={s.label}>When?</Text>
        <View style={s.pills}>
          {dates.map(([label, n]) => {
            const active = form.date_occurred === localDate(n);
            return (
              <Pressable key={label} onPress={() => set('date_occurred')(localDate(n))} style={[s.pill, active && s.pillActive]}>
                <Text style={[s.pillText, active && { color: c.bg }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field icon="calendar-outline" value={form.date_occurred} onChangeText={set('date_occurred')} placeholder="YYYY-MM-DD" hint="Or type a date as YYYY-MM-DD" />

        <View style={s.divider} />
        <Field
          label="Description" value={form.description} onChangeText={set('description')} multiline
          placeholder={isLost ? 'Colour, brand, marks, what was inside…' : 'Describe it in general terms. Keep one detail back to check the real owner.'}
        />

        <Text style={s.label}>Photo <Text style={s.optional}>· optional</Text></Text>
        {photo ? (
          <View>
            <Image source={{ uri: photo.uri }} style={s.preview} />
            <Pressable style={s.removePhoto} onPress={() => setPhoto(null)} accessibilityLabel="Remove photo">
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable style={({ hovered }) => [s.drop, hovered && { borderColor: c.text }]} onPress={() => pickPhoto(false)}>
              <Ionicons name="images-outline" size={32} color={c.text} />
              <Text style={s.dropTitle}>Add a photo</Text>
              <Text style={s.dropSub}>Posts with a photo are recognised much faster</Text>
            </Pressable>
            {Platform.OS !== 'web' ? (
              <Button title="Take a photo" icon="camera-outline" variant="outline" onPress={() => pickPhoto(true)} style={{ marginTop: 12 }} />
            ) : null}
          </>
        )}

        <View style={{ height: 20 }} />
        <ErrorText>{error}</ErrorText>
      </ScrollView>

      <View style={[s.bar, { paddingBottom: insets.bottom + 14 }]}>
        <View style={s.barInner}>
          <View style={{ flex: 1 }}>
            <Text style={s.barTitle} numberOfLines={1}>{summary}</Text>
            <Text style={s.barSub} numberOfLines={1}>{form.title.trim() || 'Add a title, category and place'}</Text>
          </View>
          <Button title={isLost ? 'Post lost item' : 'Post found item'} onPress={submit} loading={busy} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c) => ({
  section: { fontFamily: font.bold, fontSize: 20, color: c.text, letterSpacing: -0.3, marginBottom: 14 },
  label: { fontFamily: font.semibold, fontSize: 14, color: c.text, marginBottom: 10 },
  optional: { fontFamily: font.regular, color: c.muted },
  divider: { height: 1, backgroundColor: c.divider, marginVertical: 26 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 18, gap: 4 },
  choiceActive: { borderWidth: 2, borderColor: c.text, backgroundColor: c.surface, padding: 17 },
  choiceTitle: { fontFamily: font.semibold, fontSize: 16, color: c.text, marginTop: 12 },
  choiceSub: { fontFamily: font.regular, fontSize: 13, color: c.muted, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  tile: { flexGrow: 1, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, gap: 8, minHeight: 96 },
  tileActive: { borderWidth: 2, borderColor: c.text, backgroundColor: c.surface, padding: 11 },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: font.medium, fontSize: 13, color: c.text, lineHeight: 17 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  pillActive: { backgroundColor: c.text, borderColor: c.text },
  pillText: { fontFamily: font.semibold, fontSize: 13, color: c.text },
  drop: {
    height: 180, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border,
    alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20,
  },
  dropTitle: { fontFamily: font.semibold, fontSize: 16, color: c.text, marginTop: 6 },
  dropSub: { fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center' },
  preview: { width: '100%', height: 260, borderRadius: 16, backgroundColor: c.surface },
  removePhoto: {
    position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 14, paddingHorizontal: 24 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  barTitle: { fontFamily: font.bold, fontSize: 15, color: c.text },
  barSub: { fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 2 },
});

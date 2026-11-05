import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import { CATEGORIES, categoryMeta } from '../config';
import { font, useStyles, useTheme } from '../theme';
import { Button, ErrorText, Field, formatDate, Sheet, useUi } from '../ui';

const localDate = (daysBack = 0) => {
  const d = new Date(Date.now() - daysBack * 86_400_000); // local date, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptyForm = (type = 'lost') => ({
  type, title: '', category: null, location: '', date_occurred: localDate(), description: '',
});
const DAYS = [['Today', 0], ['Yesterday', 1], ['2 days ago', 2], ['3 days ago', 3]];
const PLACES = ['Library', 'Canteen', 'Main gate', 'Hostel', 'Parking', 'Auditorium', 'Sports ground', 'Computer lab'];

// Linear-style composer: a big title, a description, then property chips that each open a small picker
export default function PostScreen({ navigation, route }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [form, setForm] = useState(() => emptyForm(route.params?.type));
  const [photo, setPhoto] = useState(null);
  const [picker, setPicker] = useState(null); // 'category' | 'place' | 'date'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Other screens can open this tab with a type already chosen
  useEffect(() => {
    if (route.params?.type) setForm((f) => ({ ...f, type: route.params.type }));
  }, [route.params?.type, route.params?.t]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const isLost = form.type === 'lost';
  const missing = [!form.title.trim() && 'a title', !form.category && 'a category', !form.location.trim() && 'a place'].filter(Boolean);
  const hint = missing.length ? `Add ${missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}` : missing[0]}` : 'Ready to post';

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
    if (missing.length) return setError(`${hint} first`);

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

  const dayLabel = DAYS.find(([, n]) => localDate(n) === form.date_occurred)?.[0] || formatDate(form.date_occurred);
  const cat = form.category ? categoryMeta(form.category) : null;
  const postButton = (
    <Button title={isLost ? 'Post lost item' : 'Post found item'} onPress={submit} loading={busy} disabled={missing.length > 0} />
  );

  const composer = (
    <>
      {/* Lost / Found */}
      <View style={s.toggle}>
        {[['lost', 'I lost something'], ['found', 'I found something']].map(([value, label]) => {
          const active = form.type === value;
          return (
            <Pressable key={value} onPress={() => set('type')(value)} style={[s.toggleItem, active && s.toggleActive]}>
              <View style={[s.toggleDot, { backgroundColor: value === 'lost' ? c.lost : c.found }, !active && { opacity: 0.4 }]} />
              <Text style={[s.toggleText, active && { color: c.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={form.title} onChangeText={set('title')} maxLength={80}
        placeholder={isLost ? 'What did you lose?' : 'What did you find?'}
        placeholderTextColor={c.faint} style={s.title}
      />
      <TextInput
        value={form.description} onChangeText={set('description')} multiline
        placeholder={isLost ? 'Add details: colour, brand, marks, what was inside…' : 'Describe it in general terms. Keep one detail back to check the real owner.'}
        placeholderTextColor={c.faint} style={s.description}
      />

      {photo ? (
        <View style={s.photoWrap}>
          <Image source={{ uri: photo.uri }} style={s.photo} />
          <Pressable style={s.removePhoto} onPress={() => setPhoto(null)} accessibilityLabel="Remove photo">
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {/* Properties */}
      <View style={s.chips}>
        <PropChip s={s} c={c} icon={cat ? cat.icon : 'pricetag-outline'} iconColor={cat?.color} value={form.category} placeholder="Category" onPress={() => setPicker('category')} />
        <PropChip s={s} c={c} icon="location-outline" value={form.location.trim()} placeholder={isLost ? 'Where you lost it' : 'Where you found it'} onPress={() => setPicker('place')} />
        <PropChip s={s} c={c} icon="calendar-outline" value={dayLabel} onPress={() => setPicker('date')} />
        {!photo ? (
          <PropChip s={s} c={c} icon="image-outline" placeholder="Photo" onPress={() => pickPhoto(false)} />
        ) : null}
        {!photo && Platform.OS !== 'web' ? (
          <PropChip s={s} c={c} icon="camera-outline" placeholder="Camera" onPress={() => pickPhoto(true)} />
        ) : null}
      </View>

      <ErrorText>{error}</ErrorText>
    </>
  );

  return (
    <View style={[ui.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[s.page, wide && s.pageWide]} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>New report</Text>
        {wide ? (
          <View style={s.card}>
            {composer}
            <View style={s.cardFooter}>
              <Text style={s.footHint}>{hint}</Text>
              {postButton}
            </View>
          </View>
        ) : composer}
      </ScrollView>

      {!wide ? (
        <View style={s.bar}>
          <Text style={s.footHint}>{hint}</Text>
          {postButton}
        </View>
      ) : null}

      <Sheet visible={picker === 'category'} onClose={() => setPicker(null)} title="Category">
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={s.catGrid}>
          {CATEGORIES.map((ct) => {
            const active = form.category === ct.name;
            return (
              <Pressable
                key={ct.name}
                onPress={() => { set('category')(ct.name); setPicker(null); }}
                style={({ hovered }) => [s.catRow, (active || hovered) && { backgroundColor: c.surface }]}
              >
                <Ionicons name={ct.icon} size={17} color={ct.color} />
                <Text style={s.catText} numberOfLines={1}>{ct.name}</Text>
                {active ? <Ionicons name="checkmark" size={16} color={c.text} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>

      <Sheet visible={picker === 'place'} onClose={() => setPicker(null)} title={isLost ? 'Where did you lose it?' : 'Where did you find it?'}>
        <Field icon="location-outline" value={form.location} onChangeText={set('location')} placeholder="e.g. Library, 2nd floor" autoFocus onSubmitEditing={() => setPicker(null)} />
        <View style={s.suggestions}>
          {PLACES.map((p) => (
            <Pressable key={p} onPress={() => set('location')(p)} style={[s.suggestion, form.location === p && s.suggestionActive]}>
              <Text style={[s.suggestionText, form.location === p && { color: c.bg }]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Done" onPress={() => setPicker(null)} style={{ marginTop: 18 }} />
      </Sheet>

      <Sheet visible={picker === 'date'} onClose={() => setPicker(null)} title="When?">
        {DAYS.map(([label, n]) => {
          const active = form.date_occurred === localDate(n);
          return (
            <Pressable
              key={label}
              onPress={() => { set('date_occurred')(localDate(n)); setPicker(null); }}
              style={({ hovered }) => [s.row, (active || hovered) && { backgroundColor: c.surface }]}
            >
              <Text style={s.catText}>{label}</Text>
              <Text style={s.dateSub}>{formatDate(localDate(n))}</Text>
              {active ? <Ionicons name="checkmark" size={16} color={c.text} /> : null}
            </Pressable>
          );
        })}
        <Field
          icon="calendar-outline" value={form.date_occurred} onChangeText={set('date_occurred')}
          placeholder="YYYY-MM-DD" hint="Or type an earlier date as YYYY-MM-DD" style={{ marginTop: 14, marginBottom: 0 }}
        />
      </Sheet>
    </View>
  );
}

// A property button: shows its value once set, otherwise a quiet placeholder
function PropChip({ icon, iconColor, value, placeholder, onPress, s, c }) {
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }) => [s.chip, value && s.chipSet, (hovered || pressed) && { borderColor: c.faint }]}>
      <Ionicons name={icon} size={15} color={value ? iconColor || c.text : c.faint} />
      <Text style={[s.chipText, value && { color: c.text }]} numberOfLines={1}>{value || placeholder}</Text>
    </Pressable>
  );
}

const makeStyles = (c) => ({
  page: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150, width: '100%', maxWidth: 640, alignSelf: 'center' },
  pageWide: { maxWidth: 720, paddingTop: 48, paddingBottom: 64 },
  heading: { fontFamily: font.semibold, fontSize: 13, color: c.faint, marginBottom: 14 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: c.divider, backgroundColor: c.card, padding: 24, boxShadow: `0 20px 60px ${c.shadow}` },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8, paddingTop: 18, borderTopWidth: 1, borderTopColor: c.divider },

  toggle: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 11, backgroundColor: c.surface, marginBottom: 22 },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 32, paddingHorizontal: 12, borderRadius: 8 },
  toggleActive: { backgroundColor: c.raised, boxShadow: `0 1px 4px ${c.shadow}` },
  toggleDot: { width: 7, height: 7, borderRadius: 4 },
  toggleText: { fontFamily: font.semibold, fontSize: 13, color: c.muted },

  title: {
    fontFamily: font.bold, fontSize: 26, letterSpacing: -0.7, color: c.text, paddingVertical: 4,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  description: {
    fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: c.text, minHeight: 72, marginTop: 8, paddingVertical: 4,
    textAlignVertical: 'top', ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },

  photoWrap: { marginTop: 12, alignSelf: 'flex-start' },
  photo: { width: 140, height: 140, borderRadius: 14, backgroundColor: c.surface },
  removePhoto: {
    position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, maxWidth: 240, paddingHorizontal: 12,
    borderRadius: 9, borderWidth: 1, borderColor: c.divider, borderStyle: 'dashed',
  },
  chipSet: { borderStyle: 'solid', borderColor: c.border, backgroundColor: c.surface },
  chipText: { fontFamily: font.medium, fontSize: 13, color: c.muted },

  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.divider, paddingVertical: 12, paddingHorizontal: 20,
  },
  footHint: { flex: 1, fontFamily: font.medium, fontSize: 13, color: c.faint },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 12, borderRadius: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 12, borderRadius: 10, flexBasis: '48%', flexGrow: 1 },
  catText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: c.text },
  dateSub: { fontFamily: font.regular, fontSize: 13, color: c.faint },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  suggestionActive: { backgroundColor: c.text, borderColor: c.text },
  suggestionText: { fontFamily: font.medium, fontSize: 13, color: c.text },
});

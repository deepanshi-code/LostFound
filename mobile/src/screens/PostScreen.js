import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import { CATEGORIES } from '../config';
import { font, useStyles, useTheme } from '../theme';
import { Button, Chip, ErrorText, Field, ScreenHeader, Segmented, useUi } from '../ui';

const localDate = (daysBack = 0) => {
  const d = new Date(Date.now() - daysBack * 86_400_000); // local date, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptyForm = (type = 'lost') => ({
  type, title: '', category: null, location: '', date_occurred: localDate(), description: '',
});

export default function PostScreen({ navigation, route }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
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

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Report an item" subtitle="Takes about a minute" />

      <Segmented
        options={[{ value: 'lost', label: 'I lost something' }, { value: 'found', label: 'I found something' }]}
        value={form.type}
        onChange={set('type')}
      />
      <Text style={[ui.hint, { marginBottom: 24 }]}>
        {isLost
          ? 'People who find a matching item can reply. We also suggest matches automatically.'
          : 'The owner will have to describe a detail only they would know before you hand it over.'}
      </Text>

      <Field
        label="Item" value={form.title} onChangeText={set('title')} maxLength={80}
        placeholder={isLost ? 'e.g. Black HP laptop charger' : 'e.g. Blue steel water bottle'}
      />

      <Text style={ui.label}>Category</Text>
      <View style={s.chips}>
        {CATEGORIES.map((cat) => (
          <Chip key={cat.name} label={cat.name} icon={cat.icon} selected={form.category === cat.name} onPress={() => set('category')(cat.name)} />
        ))}
      </View>

      <Field
        label={isLost ? 'Where did you lose it?' : 'Where did you find it?'} icon="location-outline"
        value={form.location} onChangeText={set('location')} placeholder="e.g. Library, 2nd floor"
      />

      <Text style={ui.label}>When?</Text>
      <View style={s.dateRow}>
        {[['Today', 0], ['Yesterday', 1], ['2 days ago', 2]].map(([label, n]) => (
          <Chip key={label} label={label} selected={form.date_occurred === localDate(n)} onPress={() => set('date_occurred')(localDate(n))} />
        ))}
      </View>
      <Field icon="calendar-outline" value={form.date_occurred} onChangeText={set('date_occurred')} placeholder="YYYY-MM-DD" hint="Or type a date as YYYY-MM-DD" />

      <Field
        label="Description" value={form.description} onChangeText={set('description')} multiline
        placeholder={isLost ? 'Colour, brand, marks, what was inside…' : 'Describe it in general terms. Keep one detail back to check the real owner.'}
      />

      <Text style={ui.label}>Photo <Text style={s.optional}>· optional</Text></Text>
      {photo ? (
        <View style={s.previewWrap}>
          <Image source={{ uri: photo.uri }} style={s.preview} />
          <Pressable style={s.removePhoto} onPress={() => setPhoto(null)} accessibilityLabel="Remove photo">
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={s.photoRow}>
          <Pressable style={({ hovered }) => [s.photoBox, hovered && { borderColor: c.faint }]} onPress={() => pickPhoto(false)}>
            <Ionicons name="image-outline" size={22} color={c.muted} />
            <Text style={s.photoText}>Upload photo</Text>
          </Pressable>
          {Platform.OS !== 'web' ? (
            <Pressable style={s.photoBox} onPress={() => pickPhoto(true)}>
              <Ionicons name="camera-outline" size={22} color={c.muted} />
              <Text style={s.photoText}>Take photo</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <ErrorText>{error}</ErrorText>
      <Button title={isLost ? 'Post lost item' : 'Post found item'} onPress={submit} loading={busy} />
    </ScrollView>
  );
}

const makeStyles = (c) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 0 },
  optional: { fontFamily: font.regular, color: c.faint },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  photoBox: {
    flex: 1, height: 104, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  photoText: { fontFamily: font.medium, fontSize: 13, color: c.muted },
  previewWrap: { marginBottom: 24 },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: c.surface },
  removePhoto: {
    position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
});

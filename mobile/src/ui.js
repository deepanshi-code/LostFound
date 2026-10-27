import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categoryMeta } from './config';
import { font, useStyles, useTheme } from './theme';

// ---------- helpers ----------

export function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// created_at comes from SQLite as UTC "YYYY-MM-DD HH:MM:SS"
export function timeAgo(value) {
  if (!value) return '';
  const secs = (Date.now() - new Date(value.replace(' ', 'T') + 'Z')) / 1000;
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`;
  return formatDate(value);
}

// Alert.alert is a no-op on web, so fall back to window.confirm there.
export function confirm(title, message) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

// Shared styles screens can reuse: const ui = useUi();
export const useUi = () => useStyles(uiStyles);

// ---------- primitives ----------

export function Icon({ name, size = 20, color, style }) {
  const { colors: c } = useTheme();
  return <Ionicons name={name} size={size} color={color || c.muted} style={style} />;
}

// Large title at the top of a tab screen (tab screens hide the navigation header)
export function ScreenHeader({ title, subtitle, right }) {
  const ui = useUi();
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.screenHeader, { paddingTop: insets.top + 16 }]}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={ui.headerSubtitle}>{subtitle}</Text> : null}
        <Text style={ui.headerTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon, size = 'md' }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const [bg, fg, border] = {
    primary: [c.primary, c.onPrimary, c.primary],
    secondary: [c.surface, c.text, c.surface],
    outline: [c.card, c.text, c.border],
    ghost: ['transparent', c.primary, 'transparent'],
    danger: [c.dangerSoft, c.danger, c.dangerSoft],
    success: [c.found, '#FFFFFF', c.found],
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }) => [
        ui.button, size === 'sm' && ui.buttonSm,
        { backgroundColor: bg, borderColor: border },
        (disabled || loading) && { opacity: 0.45 },
        (pressed || hovered) && { opacity: 0.88 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={ui.buttonInner}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
          <Text style={[ui.buttonText, size === 'sm' && ui.buttonTextSm, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, style, icon, secure, ...inputProps }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <View style={[ui.inputWrap, focused && { borderColor: c.primary, backgroundColor: c.card }, inputProps.multiline && { alignItems: 'flex-start' }]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? c.primary : c.faint} style={{ marginRight: 10, marginTop: inputProps.multiline ? 13 : 0 }} /> : null}
        <TextInput
          placeholderTextColor={c.faint}
          style={[ui.input, inputProps.multiline && { minHeight: 100, textAlignVertical: 'top' }]}
          secureTextEntry={secure && hidden}
          {...inputProps}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={c.faint} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={ui.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, icon, selected, onPress }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <Pressable onPress={onPress} style={[ui.chip, selected && ui.chipSelected]}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.bg : c.muted} /> : null}
      <Text style={[ui.chipText, selected && { color: c.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <View style={ui.segmented}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[ui.segment, active && ui.segmentActive]}>
            {o.icon ? <Ionicons name={o.icon} size={15} color={active ? c.text : c.muted} /> : null}
            <Text style={[ui.segmentText, active && { color: c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Small status label with a coloured dot: Lost / Found / Returned / Pending / Approved / Declined
export function StatusPill({ status }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const [fg, bg, label] = {
    lost: [c.lost, c.lostSoft, 'Lost'],
    found: [c.found, c.foundSoft, 'Found'],
    resolved: [c.muted, c.surface, 'Returned'],
    pending: [c.warn, c.warnSoft, 'Pending'],
    approved: [c.found, c.foundSoft, 'Approved'],
    rejected: [c.muted, c.surface, 'Declined'],
  }[status] || [c.muted, c.surface, status];
  return (
    <View style={[ui.pill, { backgroundColor: bg }]}>
      <View style={[ui.pillDot, { backgroundColor: fg }]} />
      <Text style={[ui.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// Photo if there is one, otherwise the category icon on a neutral tile
export function Thumb({ category, uri, size = 64, radius = 12, iconSize, style }) {
  const { colors: c } = useTheme();
  const box = { width: size, height: size, borderRadius: radius };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: c.surface }, style]} />;
  return (
    <View style={[box, { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={categoryMeta(category).icon} size={iconSize || Math.round(size * 0.38)} color={c.faint} />
    </View>
  );
}

export function Avatar({ name = '?', size = 32 }) {
  const { colors: c } = useTheme();
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.primary, fontFamily: font.semibold, fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// Settings-style row: icon, label, optional value, chevron
export function ListRow({ icon, label, value, onPress, danger, last }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const color = danger ? c.danger : c.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [ui.listRow, !last && ui.listRowBorder, pressed && { backgroundColor: c.surface }]}>
      {icon ? <Ionicons name={icon} size={19} color={danger ? c.danger : c.muted} /> : null}
      <Text style={[ui.listLabel, { color }]} numberOfLines={2}>{label}</Text>
      {value ? <Text style={ui.listValue} numberOfLines={1}>{value}</Text> : null}
      {onPress && !danger ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null}
    </Pressable>
  );
}

export function Banner({ tone = 'info', icon, children }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const [fg, bg, defaultIcon] = {
    info: [c.primary, c.primarySoft, 'information-circle-outline'],
    error: [c.danger, c.dangerSoft, 'alert-circle-outline'],
    success: [c.found, c.foundSoft, 'checkmark-circle'],
    warn: [c.warn, c.warnSoft, 'notifications-outline'],
  }[tone];
  return (
    <View style={[ui.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon || defaultIcon} size={18} color={fg} style={{ marginTop: 1 }} />
      <Text style={[ui.bannerText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function ErrorText({ children }) {
  return children ? <Banner tone="error">{children}</Banner> : null;
}

export function EmptyState({ icon, title, subtitle, action }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <View style={ui.empty}>
      <View style={ui.emptyIcon}><Ionicons name={icon} size={26} color={c.faint} /></View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={ui.emptySubtitle}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, right, style }) {
  const ui = useUi();
  return (
    <View style={[ui.sectionRow, style]}>
      <Text style={ui.sectionTitle}>{children}</Text>
      {right ? <Text style={ui.sectionRight}>{right}</Text> : null}
    </View>
  );
}

const uiStyles = (c) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 680, width: '100%', alignSelf: 'center' },

  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingBottom: 16 },
  headerTitle: { fontFamily: font.bold, fontSize: 30, color: c.text, letterSpacing: -0.8 },
  headerSubtitle: { fontFamily: font.medium, fontSize: 14, color: c.muted, marginBottom: 2 },

  h2: { fontFamily: font.semibold, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 15, color: c.text, lineHeight: 22 },
  muted: { fontFamily: font.regular, fontSize: 14, color: c.muted, lineHeight: 20 },
  label: { fontFamily: font.medium, fontSize: 13, color: c.text, marginBottom: 8 },
  hint: { fontFamily: font.regular, fontSize: 12, color: c.muted, marginTop: 6, lineHeight: 17 },

  button: { height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonSm: { height: 38, borderRadius: 10, paddingHorizontal: 14 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: font.semibold, fontSize: 15 },
  buttonTextSm: { fontSize: 14 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.surface, borderRadius: 12, paddingHorizontal: 14,
  },
  // The wrapper shows focus, so hide the browser's own outline on web
  input: { flex: 1, paddingVertical: 13, fontSize: 15, fontFamily: font.regular, color: c.text, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginRight: 8, marginBottom: 8,
  },
  chipSelected: { backgroundColor: c.text, borderColor: c.text },
  chipText: { fontFamily: font.medium, fontSize: 13, color: c.text },

  segmented: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 3 },
  segment: { flex: 1, flexDirection: 'row', gap: 6, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: c.raised, boxShadow: `0 1px 3px ${c.shadow}, 0 1px 1px ${c.shadow}` },
  segmentText: { fontFamily: font.medium, fontSize: 14, color: c.muted },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 22, borderRadius: 6, alignSelf: 'flex-start' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: font.semibold, fontSize: 12 },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  listLabel: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  listValue: { fontFamily: font.regular, fontSize: 14, color: c.muted, maxWidth: '55%' },
  group: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },

  card: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 },
  banner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, marginBottom: 16 },
  bannerText: { flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20 },

  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.semibold, fontSize: 16, color: c.text, marginTop: 16 },
  emptySubtitle: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center', lineHeight: 20, maxWidth: 300 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 17, color: c.text, letterSpacing: -0.2 },
  sectionRight: { fontFamily: font.regular, fontSize: 13, color: c.muted },
  divider: { height: 1, backgroundColor: c.divider },
});

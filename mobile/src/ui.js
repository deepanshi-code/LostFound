import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORIES, categoryMeta } from './config';
import { BrandGradient, Spot } from './decor';
import { font, softShadow, tint, useStyles, useTheme } from './theme';

// ---------- helpers ----------

export function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// created_at is an ISO timestamp from Postgres (older SQLite-style "YYYY-MM-DD HH:MM:SS" is treated as UTC)
export function timeAgo(value) {
  if (!value) return '';
  const date = value.includes('T') ? new Date(value) : new Date(value.replace(' ', 'T') + 'Z');
  const secs = (Date.now() - date) / 1000;
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

// Soft pulsing placeholder shown while content loads (instead of a spinner)
export function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  const { colors: c } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: c.surface, opacity: pulse }, style]} />;
}

// Pressable that sinks slightly and springs back, like iOS cards
export function SpringPress({ children, onPress, style, scaleTo = 0.97, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: false, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Icon({ name, size = 20, color, style }) {
  const { colors: c } = useTheme();
  return <Ionicons name={name} size={size} color={color || c.muted} style={style} />;
}

// Title at the top of a tab screen (tab screens hide the navigation header), with a quiet line under it
export function ScreenHeader({ title, subtitle, right }) {
  const ui = useUi();
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.screenHeader, { paddingTop: insets.top + 18 }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.headerTitle}>{title}</Text>
        {subtitle ? <Text style={ui.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Compact segmented switch (Linear style). Options: { value, label, dot?: colour, count?: number }
export function Toggle({ options, value, onChange, style }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <View style={[ui.toggle, style]}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[ui.toggleItem, active && ui.toggleActive]} accessibilityState={{ selected: active }}>
            {o.dot ? <View style={[ui.toggleDot, { backgroundColor: o.dot }, !active && { opacity: 0.4 }]} /> : null}
            <Text style={[ui.toggleText, active && { color: c.text }]}>{o.label}</Text>
            {o.count != null ? <Text style={ui.toggleCount}>{o.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// A property button: shows its value once set (solid), otherwise a quiet dashed placeholder
export function PropChip({ icon, iconColor, value, placeholder, onPress, onClear }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }) => [ui.propChip, value && ui.propChipSet, (hovered || pressed) && { borderColor: c.faint }]}>
      <Ionicons name={icon} size={15} color={value ? iconColor || c.text : c.faint} />
      <Text style={[ui.propChipText, value && { color: c.text }]} numberOfLines={1}>{value || placeholder}</Text>
      {value && onClear ? (
        <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={`Clear ${placeholder}`}>
          <Ionicons name="close" size={14} color={c.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// Pick one of the categories in a sheet
export function CategorySheet({ visible, onClose, value, onPick }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <Sheet visible={visible} onClose={onClose} title="Category">
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={ui.catGrid}>
        {CATEGORIES.map((ct) => {
          const active = value === ct.name;
          return (
            <Pressable
              key={ct.name}
              onPress={() => { onPick(ct.name); onClose(); }}
              style={({ hovered }) => [ui.catRow, (active || hovered) && { backgroundColor: c.surface }]}
            >
              <Ionicons name={ct.icon} size={17} color={ct.color} />
              <Text style={ui.catText} numberOfLines={1}>{ct.name}</Text>
              {active ? <Ionicons name="checkmark" size={16} color={c.text} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon, size = 'md' }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  const [bg, fg, border] = {
    primary: ['transparent', c.onPrimary, 'transparent'], // drawn with the brand gradient below
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
        variant === 'primary' && ui.buttonPrimary,
        (disabled || loading) && { opacity: 0.45 },
        (pressed || hovered) && { opacity: 0.9, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      {variant === 'primary' ? <BrandGradient style={StyleSheet.absoluteFill} /> : null}
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
      <View style={[ui.inputWrap, focused && ui.inputFocused, inputProps.multiline && { alignItems: 'flex-start' }]}>
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

// color: optional accent for the icon (e.g. a category colour)
export function Chip({ label, icon, color, selected, onPress }) {
  const { colors: c } = useTheme();
  const ui = useUi();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ui.chip, selected && ui.chipSelected, pressed && { transform: [{ scale: 0.96 }] }]}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.onPrimary : color || c.muted} /> : null}
      <Text style={[ui.chipText, selected && { color: c.onPrimary }]}>{label}</Text>
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
// Photo if there is one, otherwise the category icon on a pastel tile in the category's colour
// square: fill the parent's width as a square instead of using `size`
export function Thumb({ category, uri, size = 64, radius = 12, iconSize, style, square }) {
  const { colors: c, isDark } = useTheme();
  const meta = categoryMeta(category);
  const box = square ? { width: '100%', aspectRatio: 1, borderRadius: radius } : { width: size, height: size, borderRadius: radius };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: c.surface }, style]} />;
  return (
    <View style={[box, { backgroundColor: tint(meta.color, isDark), alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={meta.icon} size={iconSize || Math.round(size * 0.38)} color={meta.color} />
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
  const ui = useUi();
  return (
    <View style={ui.empty}>
      <Spot icon={icon} size={120} />
      <Text style={ui.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={ui.emptySubtitle}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  );
}

// Bottom sheet (a centred panel on wide screens). Tapping outside closes it.
export function Sheet({ visible, onClose, title, subtitle, children }) {
  const ui = useUi();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ui.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ui.sheetWrap} pointerEvents="box-none">
        <View style={[ui.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={ui.sheetGrabber} />
          {title ? <Text style={ui.sheetTitle}>{title}</Text> : null}
          {subtitle ? <Text style={[ui.muted, { marginBottom: 16 }]}>{subtitle}</Text> : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  // Screens sit on SkyBackground, so they are transparent
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },

  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 20 },
  headerTitle: { fontFamily: font.bold, fontSize: 26, color: c.text, letterSpacing: -0.8 },
  headerSubtitle: { fontFamily: font.regular, fontSize: 14, color: c.faint, marginTop: 4 },

  toggle: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 11, backgroundColor: c.surface },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 32, paddingHorizontal: 12, borderRadius: 8 },
  toggleActive: { backgroundColor: c.raised, boxShadow: `0 1px 4px ${c.shadow}` },
  toggleDot: { width: 7, height: 7, borderRadius: 4 },
  toggleText: { fontFamily: font.semibold, fontSize: 13, color: c.muted },
  toggleCount: { fontFamily: font.semibold, fontSize: 12, color: c.faint },

  propChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, maxWidth: 240, paddingHorizontal: 12,
    borderRadius: 9, borderWidth: 1, borderColor: c.divider, borderStyle: 'dashed',
  },
  propChipSet: { borderStyle: 'solid', borderColor: c.border, backgroundColor: c.surface },
  propChipText: { fontFamily: font.medium, fontSize: 13, color: c.muted, flexShrink: 1 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 10, borderRadius: 10, flexBasis: '48%', flexGrow: 1 },
  catText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: c.text },

  // Hairline-bordered panel with rows inside (Linear-style lists and settings)
  panel: { borderRadius: 14, borderWidth: 1, borderColor: c.divider, backgroundColor: c.card, overflow: 'hidden' },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 16 },
  panelBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  section: { fontFamily: font.bold, fontSize: 15, color: c.text, letterSpacing: -0.2, marginTop: 30, marginBottom: 12 },

  h2: { fontFamily: font.bold, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 15, color: c.text, lineHeight: 23 },
  muted: { fontFamily: font.regular, fontSize: 14, color: c.muted, lineHeight: 21 },
  label: { fontFamily: font.semibold, fontSize: 13, color: c.text, marginBottom: 8 },
  hint: { fontFamily: font.regular, fontSize: 12, color: c.muted, marginTop: 6, lineHeight: 17 },

  button: { height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  buttonPrimary: { borderWidth: 0, boxShadow: `0 10px 24px ${c.primary}40` },
  buttonSm: { height: 40, borderRadius: 11, paddingHorizontal: 14 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: font.bold, fontSize: 16 },
  buttonTextSm: { fontSize: 14 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
    borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16,
  },
  inputFocused: { borderColor: c.primary, boxShadow: `0 0 0 4px ${c.primarySoft}` },
  // The wrapper shows focus, so hide the browser's own outline on web
  input: { flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: font.regular, color: c.text, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15,
    borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginRight: 8, marginBottom: 8,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary, boxShadow: `0 6px 14px ${c.primary}33` },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: c.text },

  segmented: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 14, padding: 4 },
  segment: { flex: 1, flexDirection: 'row', gap: 6, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: c.raised, ...softShadow(c, 2, 8) },
  segmentText: { fontFamily: font.semibold, fontSize: 14, color: c.muted },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 24, borderRadius: 999, alignSelf: 'flex-start' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: font.bold, fontSize: 12 },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 18 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  listLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  listValue: { fontFamily: font.regular, fontSize: 14, color: c.muted, maxWidth: '55%' },
  group: { backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.divider, overflow: 'hidden', ...softShadow(c) },

  card: { backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.divider, padding: 18, ...softShadow(c) },
  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, marginBottom: 16 },
  bannerText: { flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20 },

  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: c.text, marginTop: 16 },
  emptySubtitle: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center', lineHeight: 21, maxWidth: 300 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontFamily: font.bold, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  sectionRight: { fontFamily: font.medium, fontSize: 13, color: c.muted },
  divider: { height: 1, backgroundColor: c.divider },

  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingTop: 10,
    width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '85%', borderWidth: 1, borderColor: c.divider, borderBottomWidth: 0,
  },
  sheetGrabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: font.bold, fontSize: 19, color: c.text, letterSpacing: -0.4, marginBottom: 4 },
});

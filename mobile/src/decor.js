// Decorative pieces: page sky, line-art campus scene, notice ticker, brand mark.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, softShadow, useStyles, useTheme } from './theme';

// Soft vertical gradient behind a whole screen
export function SkyBackground({ children, style }) {
  const { colors: c } = useTheme();
  return (
    <LinearGradient colors={c.sky} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

// Brand gradient, e.g. behind buttons and the home header
export function BrandGradient({ children, style }) {
  const { colors: c } = useTheme();
  return (
    <LinearGradient colors={[c.primary, c.primaryEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

export function BrandMark({ size = 44 }) {
  return (
    <BrandGradient style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="search" size={size * 0.46} color="#fff" />
      <View style={{ position: 'absolute', right: size * 0.16, top: size * 0.14 }}>
        <Ionicons name="location" size={size * 0.24} color="#fff" />
      </View>
    </BrandGradient>
  );
}

// Line-art campus: buildings, trees, a backpack left on a bench, and a dotted trail to a map pin.
export function CampusScene({ style, opacity = 1 }) {
  const { colors: c } = useTheme();
  const stroke = { stroke: c.line, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const windows = (x0, y0, cols, rows, w = 14, h = 12, gx = 10, gy = 10) =>
    Array.from({ length: cols * rows }, (_, i) => (
      <Rect key={`${x0}-${i}`} x={x0 + (i % cols) * (w + gx)} y={y0 + Math.floor(i / cols) * (h + gy)} width={w} height={h} rx={2} {...stroke} />
    ));
  return (
    <Svg viewBox="0 0 800 240" preserveAspectRatio="xMidYMax meet" style={[{ width: '100%', aspectRatio: 800 / 240 }, style]}>
      <G opacity={opacity}>
        {/* hills */}
        <Path d="M0 214 C 120 196, 220 204, 330 210 S 560 196, 800 208" {...stroke} opacity={0.6} />
        <Line x1={0} y1={222} x2={800} y2={222} {...stroke} />
        {/* left block */}
        <Rect x={170} y={136} width={120} height={86} rx={3} {...stroke} />
        {windows(184, 150, 4, 3)}
        {/* main hall */}
        <Path d="M296 112 L400 64 L504 112 Z" {...stroke} />
        <Rect x={306} y={112} width={188} height={110} {...stroke} />
        {[326, 356, 386, 414, 444, 474].map((x) => <Line key={x} x1={x} y1={126} x2={x} y2={222} {...stroke} opacity={0.8} />)}
        <Rect x={386} y={170} width={28} height={52} rx={12} {...stroke} />
        <Circle cx={400} cy={94} r={8} {...stroke} />
        {/* right block */}
        <Rect x={510} y={150} width={104} height={72} rx={3} {...stroke} />
        {windows(522, 162, 4, 2)}
        {/* trees */}
        {[[110, 170, 26], [146, 182, 18], [654, 168, 24], [690, 180, 17], [740, 174, 21]].map(([x, y, r]) => (
          <G key={x}>
            <Circle cx={x} cy={y} r={r} {...stroke} />
            <Line x1={x} y1={y + r} x2={x} y2={222} {...stroke} />
          </G>
        ))}
        {/* bench with a forgotten backpack */}
        <Line x1={562} y1={210} x2={626} y2={210} {...stroke} />
        <Line x1={568} y1={210} x2={568} y2={222} {...stroke} />
        <Line x1={620} y1={210} x2={620} y2={222} {...stroke} />
        <Rect x={584} y={190} width={18} height={20} rx={5} stroke={c.primary} strokeWidth={1.8} fill={c.primarySoft} />
        <Path d="M588 190 C 588 183, 598 183, 598 190" stroke={c.primary} strokeWidth={1.8} fill="none" />
        {/* dotted trail to a map pin */}
        <Path d="M604 188 C 640 150, 676 150, 712 112" stroke={c.primary} strokeWidth={1.6} strokeDasharray="3 7" fill="none" strokeLinecap="round" opacity={0.8} />
        <Path d="M718 74 C 707 74, 700 82, 700 91 C 700 103, 718 116, 718 116 C 718 116, 736 103, 736 91 C 736 82, 729 74, 718 74 Z" fill={c.primary} opacity={0.9} />
        <Circle cx={718} cy={91} r={5} fill="#fff" />
        {/* birds */}
        {[[250, 52], [276, 40], [560, 58], [96, 84]].map(([x, y]) => (
          <Path key={`${x}${y}`} d={`M${x - 7} ${y} q 4 -5 7 0 q 3 -5 7 0`} {...stroke} />
        ))}
      </G>
    </Svg>
  );
}

// Scrolling notice pill: a label chip plus messages that move right to left
export function NoticeTicker({ label = 'TIP', messages }) {
  const s = useStyles(makeStyles);
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const text = messages.join('     •     ') + '     •     ';

  useEffect(() => {
    if (!width) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -width, duration: width * 28, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [width, x]);

  return (
    <View style={s.ticker} accessibilityRole="text" accessibilityLabel={messages.join('. ')}>
      <BrandGradient style={s.tickerLabel}>
        <Text style={s.tickerLabelText}>{label}</Text>
      </BrandGradient>
      <View style={s.tickerWindow}>
        {/* Absolutely positioned so the row keeps its full text width instead of being clipped */}
        <Animated.View style={[s.tickerTrack, { transform: [{ translateX: x }] }]}>
          <Text style={s.tickerText} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>{text}</Text>
          <Text style={s.tickerText}>{text}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (c) => ({
  ticker: {
    flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 999, padding: 4,
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...softShadow(c, 4, 16),
  },
  tickerLabel: { height: 32, borderRadius: 999, paddingHorizontal: 12, justifyContent: 'center', zIndex: 1 },
  tickerLabelText: { fontFamily: font.bold, fontSize: 11, color: '#fff', letterSpacing: 1 },
  tickerWindow: { flex: 1, height: 32, overflow: 'hidden', marginLeft: 10 },
  tickerTrack: { position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  tickerText: { fontFamily: font.medium, fontSize: 13, color: c.muted, flexShrink: 0, ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }) },
});

// Calm spot illustration for empty states: a large icon in soft concentric circles
export function Spot({ icon, size = 120 }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface }} />
      <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${c.shadow}` }}>
        <Ionicons name={icon} size={size * 0.28} color={c.text} />
      </View>
    </View>
  );
}

// One pastel bubble that bobs up and down forever
function Bubble({ icon, color, size, delay, style }) {
  const { isDark } = useTheme();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -8, duration: 1600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return (
    <Animated.View style={[{
      position: 'absolute', width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center',
      backgroundColor: color + (isDark ? '33' : '22'), transform: [{ translateY: y }, { rotate: `${(delay % 3) * 6 - 6}deg` }],
    }, style]}>
      <Ionicons name={icon} size={size * 0.46} color={color} />
    </Animated.View>
  );
}

// Welcome-slide scene: a big gradient circle with floating item bubbles around it
export function FloatingScene({ icon, bubbles, size = 260 }) {
  const { colors: c } = useTheme();
  const center = size * 0.42;
  const spots = [[0.02, 0.12], [0.72, 0.04], [0.8, 0.62], [0.06, 0.66], [0.4, 0.86]];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.86, height: size * 0.86, borderRadius: size, backgroundColor: c.primarySoft }} />
      <BrandGradient style={{ width: center, height: center, borderRadius: center / 2, alignItems: 'center', justifyContent: 'center', boxShadow: `0 18px 40px ${c.primary}55` }}>
        <Ionicons name={icon} size={center * 0.44} color="#fff" />
      </BrandGradient>
      {bubbles.slice(0, spots.length).map(([bIcon, color], i) => (
        <Bubble key={bIcon} icon={bIcon} color={color} size={size * 0.2} delay={i * 350}
          style={{ left: spots[i][0] * size, top: spots[i][1] * size }} />
      ))}
    </View>
  );
}

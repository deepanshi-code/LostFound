// Product-style animated scenes for the welcome slides, built from real photos and the app's own UI.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, softShadow, tint, useTheme } from './theme';

const PHOTOS = {
  bottle: require('../assets/welcome/water-bottle.jpg'),
  glasses: require('../assets/welcome/spectacles.jpg'),
  calculator: require('../assets/welcome/calculator.jpg'),
  earbuds: require('../assets/welcome/earbuds.jpg'),
  umbrella: require('../assets/welcome/umbrella.jpg'),
};

const loop = (value, steps) => Animated.loop(Animated.sequence(steps.map(([to, duration, delay = 0]) =>
  Animated.timing(value, { toValue: to, duration, delay, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }))));

// 1. A loose collage of item photos that drift gently
export function PhotoCollage({ size }) {
  const { colors: c } = useTheme();
  const tiles = [
    ['bottle', 0.04, 0.10, 0.42, -6], ['glasses', 0.52, 0.02, 0.44, 5], ['calculator', 0.56, 0.50, 0.38, -4],
    ['earbuds', 0.06, 0.56, 0.36, 7], ['umbrella', 0.32, 0.34, 0.34, -2],
  ];
  return (
    <View style={{ width: size, height: size }}>
      {tiles.map(([key, x, y, w, rot], i) => <DriftTile key={key} source={PHOTOS[key]} c={c} delay={i * 280}
        style={{ left: x * size, top: y * size, width: w * size, height: w * size, rotate: `${rot}deg` }} />)}
    </View>
  );
}

function DriftTile({ source, style, delay, c }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(y, [[-7, 1800, delay], [0, 1800]]);
    a.start();
    return () => a.stop();
  }, [y, delay]);
  const { rotate, ...box } = style;
  return (
    <Animated.View style={[{
      position: 'absolute', borderRadius: 22, borderWidth: 4, borderColor: c.card, overflow: 'hidden',
      backgroundColor: c.surface, ...softShadow(c, 12, 30), transform: [{ translateY: y }, { rotate }],
    }, box]}>
      <Image source={source} style={{ width: '100%', height: '100%' }} />
    </Animated.View>
  );
}

// 2. A lost report and a found report slide together, then a match badge pops in
export function MatchScene({ size }) {
  const { colors: c } = useTheme();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(t, [[1, 900, 300], [1, 1800], [0, 600]]);
    a.start();
    return () => a.stop();
  }, [t]);
  const cardW = size * 0.46;
  const leftX = t.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.05, size * 0.05] });
  const rightX = t.interpolate({ inputRange: [0, 1], outputRange: [size * 0.05, -size * 0.05] });
  const badge = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: size * 0.04 }}>
        <Animated.View style={{ transform: [{ translateX: leftX }, { rotate: '-4deg' }] }}>
          <MiniCard c={c} w={cardW} label="Lost" dot={c.lost} title="HP laptop charger" place="Library" icon="battery-charging-outline" color="#F59E0B" />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX: rightX }, { rotate: '4deg' }] }}>
          <MiniCard c={c} w={cardW} label="Found" dot={c.found} title="Black HP charger" place="Library, 2nd floor" icon="battery-charging-outline" color="#F59E0B" />
        </Animated.View>
      </View>
      <Animated.View style={{
        position: 'absolute', bottom: size * 0.1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: c.text, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
        opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}>
        <Ionicons name="sparkles" size={16} color={c.bg} />
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.bg }}>92% match</Text>
      </Animated.View>
    </View>
  );
}

function MiniCard({ c, w, label, dot, title, place, icon, color }) {
  const { isDark } = useTheme();
  return (
    <View style={{ width: w, backgroundColor: c.card, borderRadius: 20, padding: 10, ...softShadow(c, 14, 30) }}>
      <View style={{ height: w * 0.72, borderRadius: 14, backgroundColor: tint(color, isDark), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={w * 0.26} color={color} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
          <Text style={{ fontFamily: font.bold, fontSize: 10, color: c.text }}>{label}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.text, marginTop: 8 }} numberOfLines={1}>{title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 11, color: c.muted }} numberOfLines={1}>{place}</Text>
    </View>
  );
}

// 3. A contact card that stays locked until the poster approves, then reveals the details
export function PrivacyScene({ size }) {
  const { colors: c } = useTheme();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(t, [[1, 700, 1200], [1, 1800], [0, 500]]);
    a.start();
    return () => a.stop();
  }, [t]);
  const reveal = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const hide = t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] });
  const w = size * 0.82;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, backgroundColor: c.card, borderRadius: 24, padding: 20, ...softShadow(c, 16, 36) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: c.primary }}>AV</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.text }}>Aisha Verma</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: c.muted }}>Found your water bottle</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: c.divider, marginVertical: 16 }} />
        <View style={{ height: 64, justifyContent: 'center' }}>
          {/* Locked state */}
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, opacity: hide, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="lock-closed" size={22} color={c.faint} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surface, width: '80%' }} />
              <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surface, width: '55%' }} />
            </View>
          </Animated.View>
          {/* Revealed after approval */}
          <Animated.View style={{ opacity: reveal, gap: 8, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
            <Row icon="mail-outline" text="aisha@campus.test" c={c} />
            <Row icon="call-outline" text="+91 90000 00001" c={c} />
          </Animated.View>
        </View>
        <Animated.View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'flex-start',
          backgroundColor: c.foundSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, opacity: reveal,
        }}>
          <Ionicons name="checkmark-circle" size={15} color={c.found} />
          <Text style={{ fontFamily: font.bold, fontSize: 12, color: c.found }}>Approved by the finder</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Row({ icon, text, c }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={18} color={c.text} />
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: c.text }}>{text}</Text>
    </View>
  );
}

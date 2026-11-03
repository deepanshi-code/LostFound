import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../decor';
import { MatchScene, PhotoCollage, PrivacyScene } from '../welcomeScenes';
import { font, useStyles, useTheme } from '../theme';
import { Button } from '../ui';

// [scene, title, text]
const SLIDES = [
  [PhotoCollage, 'Lost something on campus?', 'Post it in under a minute with a photo, the place and the time. The whole campus can help you look.'],
  [MatchScene, 'We find the matches', 'Lost and found reports are compared automatically, so the right people find each other faster.'],
  [PrivacyScene, 'Safe, private handovers', 'Owners prove an item is theirs, and contact details are shared only after the finder approves.'],
];

export default function WelcomeScreen({ onDone }) {
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 560);
  const scroller = useRef(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const goTo = (i) => {
    scroller.current?.scrollTo({ x: i * pageWidth, animated: true });
    setPage(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView style={s.safe}>
        <View style={[s.top, { width: pageWidth }]}>
          <View style={s.brand}>
            <BrandMark size={34} />
            <Text style={s.brandName}>Campus Lost & Found</Text>
          </View>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
              <Text style={s.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: pageWidth, flexGrow: 0 }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
          scrollEventThrottle={32}
        >
          {SLIDES.map(([Scene, title, text]) => (
            <View key={title} style={[s.slide, { width: pageWidth }]}>
              <Scene size={Math.min(pageWidth - 48, 320)} />
              <Text style={s.title}>{title}</Text>
              <Text style={s.text}>{text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={[s.bottom, { width: pageWidth }]}>
          <View style={s.dots}>
            {SLIDES.map((slide, i) => (
              <Pressable key={slide[1]} onPress={() => goTo(i)} hitSlop={8} accessibilityLabel={`Slide ${i + 1}`}>
                <View style={[s.dot, i === page && { width: 22, backgroundColor: c.primary }]} />
              </Pressable>
            ))}
          </View>
          <Button title={last ? 'Get started' : 'Next'} icon={last ? 'arrow-forward' : undefined} onPress={() => (last ? onDone() : goTo(page + 1))} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c) => ({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontFamily: font.bold, fontSize: 15, color: c.text },
  skip: { fontFamily: font.semibold, fontSize: 15, color: c.muted },
  slide: { alignItems: 'center', paddingHorizontal: 30 },
  title: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, color: c.text, textAlign: 'center', letterSpacing: -0.8, marginTop: 28 },
  text: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: c.muted, textAlign: 'center', marginTop: 12, maxWidth: 400 },
  bottom: { paddingHorizontal: 24, paddingBottom: 12, gap: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
});

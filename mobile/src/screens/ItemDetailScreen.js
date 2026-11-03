import { useCallback, useEffect, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api, imageUrl } from '../api';
import { categoryMeta } from '../config';
import GridCard from '../GridCard';
import { font, tint, useStyles, useTheme } from '../theme';
import {
  Avatar, Banner, Button, confirm, EmptyState, ErrorText, Field, formatDate, ListRow, Skeleton,
  StatusPill, timeAgo, useUi,
} from '../ui';

const SITE = 'https://lostfound-mobile.vercel.app';

export default function ItemDetailScreen({ route, navigation }) {
  const { id, justPosted } = route.params;
  const { colors: c, isDark } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const detail = await api(`/items/${id}`);
      setData(detail);
      setError('');
      if (detail.item.is_mine) setMatches((await api(`/items/${id}/matches`)).matches);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Wraps an action: shows a spinner, reports errors, reloads on success
  const run = (fn) => async () => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const heroHeight = wide ? 440 : Math.min(width * 0.9, 420);
  const back = (
    <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={s.round} accessibilityLabel="Back">
      <Ionicons name="chevron-back" size={20} color="#222" />
    </Pressable>
  );

  if (!data) {
    return (
      <View style={[ui.screen, { backgroundColor: c.bg }]}>
        {error ? (
          <View style={{ paddingTop: insets.top + 60 }}>
            <EmptyState icon="alert-circle-outline" title="Couldn't load this item" subtitle={error} />
          </View>
        ) : (
          <View style={[s.page, wide && s.pageWide]}>
            <Skeleton height={heroHeight} radius={wide ? 20 : 0} />
            <View style={s.body}>
              <Skeleton width="70%" height={26} />
              <Skeleton width="45%" height={14} style={{ marginTop: 12 }} />
              <Skeleton height={60} style={{ marginTop: 28 }} radius={14} />
            </View>
          </View>
        )}
        <View style={[s.floating, { top: insets.top + 12 }]}>{back}</View>
      </View>
    );
  }

  const { item, claims, my_claim: myClaim, poster_contact: posterContact } = data;
  const isFound = item.type === 'found';
  const resolved = item.status === 'resolved';
  const uri = imageUrl(item.image_url);
  const canRespond = !item.is_mine && !myClaim && !resolved;

  const sendClaim = async () => {
    const ok = await run(() => api(`/items/${id}/claims`, { method: 'POST', body: { message } }))();
    if (ok) { setMessage(''); setSheet(false); setNotice('Response sent. You\'ll see the reply here.'); }
  };
  const decide = (claimId, status) => run(() => api(`/claims/${claimId}`, { method: 'PATCH', body: { status } }));
  const setStatus = (status) => run(() => api(`/items/${id}/status`, { method: 'PATCH', body: { status } }));
  const remove = async () => {
    if (!(await confirm('Delete this post?', 'This cannot be undone.'))) return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    }
  };
  const share = async () => {
    const text = `${isFound ? 'Found' : 'Lost'}: ${item.title} at ${item.location}. Seen it? Check Campus Lost & Found: ${SITE}`;
    try {
      if (Platform.OS === 'web' && !navigator.share) {
        await navigator.clipboard.writeText(text);
        setNotice('Copied to clipboard. Paste it in your class group.');
      } else {
        await Share.share({ message: text });
      }
    } catch { /* cancelled */ }
  };

  return (
    <View style={[ui.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: (canRespond || item.is_mine) ? 120 : 48 }}>
        <View style={[s.page, wide && s.pageWide]}>
          {/* Photo */}
          <View style={[s.hero, { height: heroHeight }, wide && { borderRadius: 20, marginTop: insets.top + 64 }]}>
            {uri ? (
              <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(categoryMeta(item.category).color, isDark) }}>
                <Ionicons name={categoryMeta(item.category).icon} size={80} color={categoryMeta(item.category).color} />
              </View>
            )}
          </View>

          <View style={s.body}>
            {justPosted && item.is_mine ? <Banner tone="success">Your post is live. Possible matches will appear below.</Banner> : null}
            {resolved ? <Banner tone="success" icon="checkmark-circle">This item has been returned to its owner.</Banner> : null}
            {notice ? <Banner tone="info" icon="checkmark-circle-outline">{notice}</Banner> : null}

            <Text style={s.title}>{item.title}</Text>
            <Text style={s.subtitle}>
              {resolved ? 'Returned' : isFound ? 'Found' : 'Lost'} · {item.location} · {timeAgo(item.created_at)}
            </Text>

            <View style={s.divider} />
            <View style={s.poster}>
              <Avatar name={item.poster_name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={s.posterName}>{item.is_mine ? 'You posted this' : `${isFound ? 'Found' : 'Lost'} by ${item.poster_name}`}</Text>
                <Text style={s.posterSub}>{item.is_mine ? 'Responses and matches are below' : 'Contact details are shared only after approval'}</Text>
              </View>
            </View>
            <View style={s.divider} />

            {item.description ? <Text style={s.description}>{item.description}</Text> : null}

            <Text style={s.section}>Details</Text>
            <Detail icon="location-outline" label={isFound ? 'Found at' : 'Lost at'} value={item.location} s={s} c={c} />
            <Detail icon="calendar-outline" label="Date" value={formatDate(item.date_occurred)} s={s} c={c} />
            <Detail icon={categoryMeta(item.category).icon} label="Category" value={item.category} s={s} c={c} />

            <ErrorText>{error}</ErrorText>

            {item.is_mine ? (
              <>
                <View style={s.divider} />
                <Text style={s.section}>Responses {claims.length ? `· ${claims.length}` : ''}</Text>
                {claims.length === 0 ? (
                  <Text style={s.muted}>No responses yet. You'll see them here when someone replies.</Text>
                ) : (
                  claims.map((cl) => (
                    <View key={cl.id} style={s.response}>
                      <View style={s.responseHead}>
                        <Avatar name={cl.claimant_name} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.responseName}>{cl.claimant_name}</Text>
                          <Text style={s.muted}>{timeAgo(cl.created_at)}</Text>
                        </View>
                        <StatusPill status={cl.status} />
                      </View>
                      <Text style={s.responseText}>{cl.message}</Text>
                      {cl.status === 'pending' ? (
                        <View style={s.row}>
                          <Button title="Approve" icon="checkmark" size="sm" onPress={decide(cl.id, 'approved')} disabled={busy} style={{ flex: 1 }} />
                          <Button title="Decline" variant="outline" size="sm" onPress={decide(cl.id, 'rejected')} disabled={busy} style={{ flex: 1 }} />
                        </View>
                      ) : null}
                      {cl.status === 'approved' ? <Contact email={cl.claimant_email} phone={cl.claimant_phone} /> : null}
                    </View>
                  ))
                )}

                <View style={s.divider} />
                <Text style={s.section}>Possible matches</Text>
                {matches.length === 0 ? (
                  <Text style={s.muted}>No similar {isFound ? 'lost' : 'found'} reports yet. We compare category, keywords, place and date.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }} style={{ marginHorizontal: -24, paddingHorizontal: 24 }}>
                    {matches.map((m, i) => (
                      <View key={m.id} style={{ width: 200 }}>
                        <GridCard item={m} index={i} onPress={() => navigation.push('ItemDetail', { id: m.id })} />
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Pressable onPress={remove} style={s.deleteLink} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={c.danger} />
                  <Text style={s.deleteText}>Delete this post</Text>
                </Pressable>
              </>
            ) : myClaim ? (
              <>
                <View style={s.divider} />
                <Text style={s.section}>Your response</Text>
                <View style={s.response}>
                  <View style={s.responseHead}>
                    <Text style={[s.responseName, { flex: 1 }]}>Sent {timeAgo(myClaim.created_at)}</Text>
                    <StatusPill status={myClaim.status} />
                  </View>
                  <Text style={s.responseText}>{myClaim.message}</Text>
                  {myClaim.status === 'pending' ? <Text style={s.muted}>Waiting for {item.poster_name} to review it.</Text> : null}
                  {myClaim.status === 'rejected' ? <Text style={s.muted}>The poster didn't think this was a match.</Text> : null}
                  {myClaim.status === 'approved' ? (
                    <>
                      <Text style={s.muted}>Approved. Contact {item.poster_name} to arrange the handover.</Text>
                      <Contact email={posterContact?.email} phone={posterContact?.phone} />
                    </>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Floating round buttons over the photo */}
      <View style={[s.floating, { top: insets.top + 12 }, wide && s.floatingWide]}>
        {back}
        <Pressable onPress={share} style={s.round} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={19} color="#222" />
        </Pressable>
      </View>

      {/* Sticky action bar */}
      {canRespond || item.is_mine ? (
        <View style={[s.bar, { paddingBottom: insets.bottom + 14 }]}>
          <View style={[s.barInner, wide && { maxWidth: 1000 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.barTitle}>
                {item.is_mine ? (resolved ? 'Returned to its owner' : 'Got it back to its owner?') : isFound ? 'Is this yours?' : 'Did you find this?'}
              </Text>
              <Text style={s.barSub} numberOfLines={1}>
                {item.is_mine ? 'Close the post once it\'s handed over' : isFound ? 'Prove it with a detail that isn\'t shown' : 'Tell the owner where it is now'}
              </Text>
            </View>
            {item.is_mine ? (
              resolved
                ? <Button title="Reopen" variant="outline" onPress={setStatus('open')} disabled={busy} />
                : <Button title={isFound ? 'Mark returned' : 'Got it back'} onPress={setStatus('resolved')} disabled={busy} />
            ) : (
              <Button title={isFound ? 'Claim it' : 'I found it'} onPress={() => setSheet(true)} />
            )}
          </View>
        </View>
      ) : null}

      {/* Bottom sheet for claiming */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap} pointerEvents="box-none">
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>{isFound ? 'Is this yours?' : 'Did you find this?'}</Text>
            <Text style={[s.muted, { marginBottom: 16 }]}>
              {isFound
                ? 'Describe something that isn\'t in the post, like a mark, the contents or the lock screen, so the finder can check it\'s yours.'
                : 'Tell the owner where you found it and where it is now.'}
            </Text>
            <Field
              value={message} onChangeText={setMessage} multiline autoFocus
              placeholder={isFound ? 'e.g. There\'s a sticker on the back and a crack near the port' : 'e.g. Found it in Room 204, handed to the security desk'}
              hint="Your email and phone are shared only if the poster approves."
            />
            <ErrorText>{sheet ? error : ''}</ErrorText>
            <Button title="Send" icon="paper-plane-outline" onPress={sendClaim} loading={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Detail({ icon, label, value, s, c }) {
  return (
    <View style={s.detail}>
      <Ionicons name={icon} size={24} color={c.text} />
      <View style={{ flex: 1 }}>
        <Text style={s.detailValue}>{value}</Text>
        <Text style={s.detailLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Contact({ email, phone }) {
  const ui = useUi();
  return (
    <View style={[ui.group, { marginTop: 14 }]}>
      {email ? <ListRow icon="mail-outline" label={email} onPress={() => Linking.openURL(`mailto:${email}`)} last={!phone} /> : null}
      {phone ? <ListRow icon="call-outline" label={phone} onPress={() => Linking.openURL(`tel:${phone}`)} last /> : null}
    </View>
  );
}

const makeStyles = (c) => ({
  page: { width: '100%', alignSelf: 'center' },
  pageWide: { maxWidth: 1000, paddingHorizontal: 24 },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: c.surface },
  body: { paddingHorizontal: 24, paddingTop: 24, maxWidth: 760 },
  floating: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  floatingWide: { maxWidth: 1000, alignSelf: 'center', left: undefined, right: undefined, width: '100%', paddingHorizontal: 40 },
  round: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
  },
  title: { fontFamily: font.bold, fontSize: 26, lineHeight: 32, color: c.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: c.muted, marginTop: 6 },
  divider: { height: 1, backgroundColor: c.divider, marginVertical: 22 },
  poster: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  posterName: { fontFamily: font.semibold, fontSize: 16, color: c.text },
  posterSub: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  description: { fontFamily: font.regular, fontSize: 16, lineHeight: 25, color: c.text, marginBottom: 24 },
  section: { fontFamily: font.bold, fontSize: 20, color: c.text, letterSpacing: -0.3, marginBottom: 16 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  detailValue: { fontFamily: font.semibold, fontSize: 16, color: c.text },
  detailLabel: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginTop: 1 },
  muted: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: c.muted },
  response: { borderWidth: 1, borderColor: c.divider, borderRadius: 16, padding: 16, marginBottom: 12, gap: 10 },
  responseHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  responseName: { fontFamily: font.semibold, fontSize: 15, color: c.text },
  responseText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: c.text },
  row: { flexDirection: 'row', gap: 10 },
  deleteLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, alignSelf: 'flex-start' },
  deleteText: { fontFamily: font.semibold, fontSize: 14, color: c.danger, textDecorationLine: 'underline' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 14, paddingHorizontal: 24 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', alignSelf: 'center' },
  barTitle: { fontFamily: font.bold, fontSize: 15, color: c.text },
  barSub: { fontFamily: font.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  backdrop: { ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontFamily: font.bold, fontSize: 22, color: c.text, letterSpacing: -0.4, marginBottom: 6 },
});

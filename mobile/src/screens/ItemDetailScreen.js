import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api, imageUrl } from '../api';
import { categoryMeta } from '../config';
import GridCard from '../GridCard';
import { font, tint, useStyles, useTheme } from '../theme';
import {
  Avatar, Banner, Button, confirm, EmptyState, ErrorText, Field, formatDate, Sheet, Skeleton, StatusPill, timeAgo, useUi,
} from '../ui';

const SITE = 'https://lostfound-mobile.vercel.app';

// Linear-style layout: photo, title, one compact properties panel, then a quiet activity list.
// On wide screens the photo sits on the left and everything else on the right.
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

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));
  const photoHeight = wide ? 520 : Math.min((width - 32) * 0.8, 440);

  if (!data) {
    return (
      <View style={[ui.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <TopBar s={s} c={c} onBack={goBack} />
        {error ? (
          <EmptyState icon="alert-circle-outline" title="Couldn't load this item" subtitle={error} />
        ) : (
          <View style={s.narrow}>
            <Skeleton height={photoHeight} radius={18} />
            <Skeleton width="30%" height={14} style={{ marginTop: 20 }} />
            <Skeleton width="75%" height={28} style={{ marginTop: 12 }} />
            <Skeleton height={150} radius={14} style={{ marginTop: 24 }} />
          </View>
        )}
      </View>
    );
  }

  const { item, claims, my_claim: myClaim, poster_contact: posterContact } = data;
  const isFound = item.type === 'found';
  const resolved = item.status === 'resolved';
  const uri = imageUrl(item.image_url);
  const meta = categoryMeta(item.category);
  const canRespond = !item.is_mine && !myClaim && !resolved;

  const sendClaim = async () => {
    const ok = await run(() => api(`/items/${id}/claims`, { method: 'POST', body: { message } }))();
    if (ok) { setMessage(''); setSheet(false); setNotice('Response sent. You\'ll get an email when the poster replies.'); }
  };
  const decide = (claimId, status) => run(() => api(`/claims/${claimId}`, { method: 'PATCH', body: { status } }));
  const setStatus = (status) => run(() => api(`/items/${id}/status`, { method: 'PATCH', body: { status } }));
  const remove = async () => {
    if (!(await confirm('Delete this post?', 'This cannot be undone.'))) return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      goBack();
    } catch (e) {
      setError(e.message);
    }
  };
  const share = async () => {
    const text = `${isFound ? 'Found' : 'Lost'}: ${item.title} at ${item.location}. Seen it? Check Campus Lost & Found: ${SITE}/item/${item.id}`;
    try {
      if (Platform.OS === 'web' && !navigator.share) {
        await navigator.clipboard.writeText(text);
        setNotice('Link copied. Paste it in your class group.');
      } else {
        await Share.share({ message: text });
      }
    } catch { /* cancelled */ }
  };

  // The one main action on this page
  const action = item.is_mine
    ? resolved
      ? <Button title="Reopen post" variant="outline" onPress={setStatus('open')} disabled={busy} />
      : <Button title={isFound ? 'Mark as returned' : 'I got it back'} icon="checkmark" onPress={setStatus('resolved')} disabled={busy} />
    : canRespond
      ? <Button title={isFound ? 'This is mine' : 'I found this'} onPress={() => setSheet(true)} />
      : null;

  const photo = (
    <View style={[s.photo, { height: uri ? photoHeight : Math.min(photoHeight, 190) }]}>
      {uri ? (
        <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={s.noPhoto}>
          <View style={[s.noPhotoIcon, { backgroundColor: tint(meta.color, isDark) }]}>
            <Ionicons name={meta.icon} size={30} color={meta.color} />
          </View>
          <Text style={s.noPhotoText}>No photo added</Text>
        </View>
      )}
    </View>
  );

  const details = (
    <View>
      {justPosted && item.is_mine ? <Banner tone="success">Your post is live. You'll get an email if someone responds or a match is posted.</Banner> : null}
      {notice ? <Banner tone="info" icon="checkmark-circle-outline">{notice}</Banner> : null}

      <View style={s.statusRow}>
        <StatusPill status={resolved ? 'resolved' : item.type} />
        <Text style={s.statusMeta}>{timeAgo(item.created_at)}</Text>
      </View>
      <Text style={[s.title, wide && { fontSize: 34, lineHeight: 40 }]}>{item.title}</Text>
      {item.description ? <Text style={s.description}>{item.description}</Text> : null}

      <View style={s.props}>
        <Prop label={isFound ? 'Found at' : 'Lost at'} s={s}>
          <Text style={s.propValue}>{item.location}</Text>
        </Prop>
        <Prop label="Date" s={s}>
          <Text style={s.propValue}>{formatDate(item.date_occurred)}</Text>
        </Prop>
        <Prop label="Category" s={s}>
          <View style={s.propInline}>
            <Ionicons name={meta.icon} size={15} color={meta.color} />
            <Text style={s.propValue}>{item.category}</Text>
          </View>
        </Prop>
        <Prop label="Posted by" s={s} last>
          <View style={s.propInline}>
            <Avatar name={item.poster_name} size={20} />
            <Text style={s.propValue}>{item.is_mine ? 'You' : item.poster_name}</Text>
          </View>
        </Prop>
      </View>

      {!item.is_mine && !myClaim ? (
        <View style={s.note}>
          <Ionicons name="lock-closed-outline" size={14} color={c.faint} />
          <Text style={s.noteText}>Contact details are shared only after the poster approves.</Text>
        </View>
      ) : null}

      <ErrorText>{error}</ErrorText>
      {wide && action ? <View style={{ marginTop: 20 }}>{action}</View> : null}

      {item.is_mine ? (
        <>
          <SectionLabel s={s} count={claims.length}>Responses</SectionLabel>
          {claims.length === 0 ? (
            <Text style={s.empty}>No responses yet. We'll email you when someone replies.</Text>
          ) : (
            claims.map((cl, i) => (
              <Activity key={cl.id} s={s} name={cl.claimant_name} time={cl.created_at} message={cl.message} last={i === claims.length - 1}>
                {cl.status === 'pending' ? (
                  <View style={s.decide}>
                    <Button title="Approve" size="sm" onPress={decide(cl.id, 'approved')} disabled={busy} />
                    <Button title="Decline" size="sm" variant="secondary" onPress={decide(cl.id, 'rejected')} disabled={busy} />
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}><StatusPill status={cl.status} /></View>
                )}
                {cl.status === 'approved' ? <Contact s={s} c={c} email={cl.claimant_email} phone={cl.claimant_phone} /> : null}
              </Activity>
            ))
          )}

          <SectionLabel s={s} count={matches.length || null}>Possible matches</SectionLabel>
          {matches.length === 0 ? (
            <Text style={s.empty}>Nothing similar yet. We compare category, keywords, place and date.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {matches.map((m, i) => (
                <View key={m.id} style={{ width: 180 }}>
                  <GridCard item={m} index={i} onPress={() => navigation.push('ItemDetail', { id: m.id })} />
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={remove} style={({ hovered }) => [s.delete, hovered && { opacity: 0.7 }]} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={c.danger} />
            <Text style={s.deleteText}>Delete post</Text>
          </Pressable>
        </>
      ) : myClaim ? (
        <>
          <SectionLabel s={s}>Your response</SectionLabel>
          <Activity s={s} name="You" time={myClaim.created_at} message={myClaim.message} last>
            <View style={{ marginTop: 10 }}><StatusPill status={myClaim.status} /></View>
            <Text style={[s.empty, { marginTop: 10 }]}>
              {myClaim.status === 'pending'
                ? `Waiting for ${item.poster_name}. We'll email you when they decide.`
                : myClaim.status === 'rejected'
                  ? 'The poster didn\'t think this was a match.'
                  : `Approved. Contact ${item.poster_name} to arrange a handover somewhere public.`}
            </Text>
            {myClaim.status === 'approved' ? <Contact s={s} c={c} email={posterContact?.email} phone={posterContact?.phone} /> : null}
          </Activity>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={[ui.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <TopBar s={s} c={c} onBack={goBack} onShare={share} crumb={`${isFound ? 'Found' : 'Lost'} · ${item.category}`} wide={wide} />
      <ScrollView contentContainerStyle={{ paddingBottom: !wide && action ? 110 : 56 }}>
        {wide ? (
          <View style={s.wide}>
            <View style={{ flex: 1.15 }}>{photo}</View>
            <View style={{ flex: 1 }}>{details}</View>
          </View>
        ) : (
          <View style={s.narrow}>
            {photo}
            <View style={{ height: 20 }} />
            {details}
          </View>
        )}
      </ScrollView>

      {!wide && action ? (
        <View style={[s.bar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.barInner}>{action}</View>
        </View>
      ) : null}

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={isFound ? 'Is this yours?' : 'Did you find this?'}
        subtitle={isFound
          ? 'Describe something that isn\'t in the post, like a mark, the contents or the lock screen, so the finder can check.'
          : 'Tell the owner where you found it and where it is now.'}
      >
        <Field
          value={message} onChangeText={setMessage} multiline autoFocus
          placeholder={isFound ? 'e.g. There\'s a sticker on the back and a crack near the port' : 'e.g. Found it in Room 204, handed to the security desk'}
          hint="Your email and phone are shared only if the poster approves."
        />
        <ErrorText>{sheet ? error : ''}</ErrorText>
        <Button title="Send response" onPress={sendClaim} loading={busy} />
      </Sheet>
    </View>
  );
}

function TopBar({ s, c, onBack, onShare, crumb, wide }) {
  return (
    <View style={[s.top, wide && s.topWide]}>
      <IconButton s={s} c={c} icon="chevron-back" label="Back" onPress={onBack} />
      <Text style={s.crumb} numberOfLines={1}>{crumb}</Text>
      {onShare ? <IconButton s={s} c={c} icon="share-outline" label="Share" onPress={onShare} /> : <View style={{ width: 36 }} />}
    </View>
  );
}

function IconButton({ s, c, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={({ hovered, pressed }) => [s.iconBtn, (hovered || pressed) && { backgroundColor: c.surface }]}>
      <Ionicons name={icon} size={18} color={c.text} />
    </Pressable>
  );
}

function Prop({ label, children, s, last }) {
  return (
    <View style={[s.prop, !last && s.propBorder]}>
      <Text style={s.propLabel}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

function SectionLabel({ children, count, s }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {count ? <View style={s.count}><Text style={s.countText}>{count}</Text></View> : null}
    </View>
  );
}

// One entry in the activity list: avatar, name and time, the message, then any actions
function Activity({ name, time, message, children, s, last }) {
  return (
    <View style={s.activity}>
      <View style={s.rail}>
        <Avatar name={name} size={28} />
        {!last ? <View style={s.railLine} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 22 }}>
        <Text style={s.activityHead}>
          <Text style={s.activityName}>{name}</Text>
          <Text style={s.activityTime}>  {timeAgo(time)}</Text>
        </Text>
        <Text style={s.activityText}>{message}</Text>
        {children}
      </View>
    </View>
  );
}

function Contact({ email, phone, s, c }) {
  return (
    <View style={s.contact}>
      {[[email, 'mail-outline', `mailto:${email}`], [phone, 'call-outline', `tel:${phone}`]].filter(([v]) => v).map(([value, icon, url]) => (
        <Pressable key={icon} onPress={() => Linking.openURL(url)} style={({ hovered }) => [s.contactRow, hovered && { backgroundColor: c.surface }]}>
          <Ionicons name={icon} size={16} color={c.primary} />
          <Text style={s.contactText} numberOfLines={1}>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (c) => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 52 },
  topWide: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  crumb: { flex: 1, textAlign: 'center', fontFamily: font.medium, fontSize: 13, color: c.muted },

  narrow: { paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  wide: { flexDirection: 'row', gap: 48, maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 12 },
  photo: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: c.divider, borderRadius: 18 },
  noPhotoIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { fontFamily: font.medium, fontSize: 13, color: c.faint },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusMeta: { fontFamily: font.medium, fontSize: 13, color: c.faint },
  title: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, color: c.text, letterSpacing: -0.9, marginTop: 12 },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: c.muted, marginTop: 10 },

  props: { marginTop: 22, borderRadius: 14, borderWidth: 1, borderColor: c.divider, backgroundColor: c.card, paddingHorizontal: 16 },
  prop: { flexDirection: 'row', alignItems: 'center', minHeight: 46, gap: 12 },
  propBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  propLabel: { width: 92, fontFamily: font.medium, fontSize: 13, color: c.faint },
  propValue: { fontFamily: font.semibold, fontSize: 14, color: c.text },
  propInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 13, color: c.faint },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 34, marginBottom: 16 },
  section: { fontFamily: font.bold, fontSize: 15, color: c.text, letterSpacing: -0.2 },
  count: { minWidth: 20, height: 20, borderRadius: 6, paddingHorizontal: 6, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: font.bold, fontSize: 11, color: c.muted },
  empty: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: c.faint },

  activity: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center' },
  railLine: { flex: 1, width: 1, backgroundColor: c.divider, marginTop: 6 },
  activityHead: { lineHeight: 28 },
  activityName: { fontFamily: font.semibold, fontSize: 14, color: c.text },
  activityTime: { fontFamily: font.regular, fontSize: 13, color: c.faint },
  activityText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: c.text, marginTop: 2 },
  decide: { flexDirection: 'row', gap: 8, marginTop: 12 },

  contact: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 44 },
  contactText: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: c.text },

  delete: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 36, alignSelf: 'flex-start' },
  deleteText: { fontFamily: font.semibold, fontSize: 13, color: c.danger },

  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 12, paddingHorizontal: 16 },
  barInner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
});

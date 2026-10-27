import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { api, imageUrl } from '../api';
import ItemCard from '../ItemCard';
import { font, useStyles, useTheme } from '../theme';
import {
  Avatar, Banner, Button, confirm, EmptyState, ErrorText, Field, formatDate, ListRow, SectionTitle,
  StatusPill, Thumb, timeAgo, useUi,
} from '../ui';

export default function ItemDetailScreen({ route, navigation }) {
  const { id, justPosted } = route.params;
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

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
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <View style={ui.screen}>
        {error
          ? <EmptyState icon="alert-circle-outline" title="Couldn't load this item" subtitle={error} />
          : <ActivityIndicator style={{ marginTop: 60 }} color={c.muted} />}
      </View>
    );
  }

  const { item, claims, my_claim: myClaim, poster_contact: posterContact } = data;
  const isFound = item.type === 'found';
  const resolved = item.status === 'resolved';

  const sendClaim = run(async () => {
    await api(`/items/${id}/claims`, { method: 'POST', body: { message } });
    setMessage('');
  });
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

  return (
    <ScrollView style={ui.screen} contentContainerStyle={[ui.content, { paddingTop: 4 }]}>
      {justPosted && item.is_mine ? <Banner tone="success">Your post is live. Possible matches will appear below.</Banner> : null}
      {resolved ? <Banner tone="success" icon="checkmark-circle">This item has been returned to its owner.</Banner> : null}

      <Thumb category={item.category} uri={imageUrl(item.image_url)} radius={16} iconSize={56} style={s.hero} />

      <View style={s.statusRow}>
        <StatusPill status={resolved ? 'resolved' : item.type} />
        <Text style={s.time}>Posted {timeAgo(item.created_at)}</Text>
      </View>
      <Text style={s.title}>{item.title}</Text>
      {item.description ? <Text style={[ui.body, { color: c.muted, marginBottom: 20 }]}>{item.description}</Text> : <View style={{ height: 12 }} />}

      <View style={ui.group}>
        <ListRow icon="location-outline" label={isFound ? 'Found at' : 'Lost at'} value={item.location} />
        <ListRow icon="calendar-outline" label="Date" value={formatDate(item.date_occurred)} />
        <ListRow icon="pricetag-outline" label="Category" value={item.category} last />
      </View>

      <View style={s.poster}>
        <Avatar name={item.poster_name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.posterName}>{item.is_mine ? 'You' : item.poster_name}</Text>
          <Text style={ui.hint}>{item.is_mine ? 'You posted this item' : 'Contact details are shared after approval'}</Text>
        </View>
      </View>

      <ErrorText>{error}</ErrorText>

      {item.is_mine ? (
        <>
          <SectionTitle right={claims.length ? String(claims.length) : null}>Responses</SectionTitle>
          {claims.length === 0 ? (
            <Text style={ui.muted}>No responses yet. You'll see them here when someone replies.</Text>
          ) : (
            claims.map((cl) => (
              <View key={cl.id} style={[ui.card, { marginBottom: 10 }]}>
                <View style={s.claimHead}>
                  <Avatar name={cl.claimant_name} size={30} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.claimName}>{cl.claimant_name}</Text>
                    <Text style={s.time}>{timeAgo(cl.created_at)}</Text>
                  </View>
                  <StatusPill status={cl.status} />
                </View>
                <Text style={[ui.body, { marginTop: 12 }]}>{cl.message}</Text>
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

          <SectionTitle right="Suggested automatically">Possible matches</SectionTitle>
          {matches.length === 0 ? (
            <Text style={ui.muted}>
              No similar {isFound ? 'lost' : 'found'} reports yet. We compare category, keywords, place and date.
            </Text>
          ) : (
            matches.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <View style={[ui.divider, { marginLeft: 82 }]} /> : null}
                <ItemCard item={m} onPress={() => navigation.push('ItemDetail', { id: m.id })} />
              </View>
            ))
          )}

          <View style={[s.row, { marginTop: 32 }]}>
            {resolved ? (
              <Button title="Reopen post" icon="arrow-undo-outline" variant="outline" onPress={setStatus('open')} disabled={busy} style={{ flex: 1 }} />
            ) : (
              <Button
                title={isFound ? 'Mark as returned' : 'Mark as recovered'} icon="checkmark-circle"
                variant="success" onPress={setStatus('resolved')} disabled={busy} style={{ flex: 1 }}
              />
            )}
            <Button title="Delete" icon="trash-outline" variant="danger" onPress={remove} disabled={busy} />
          </View>
        </>
      ) : myClaim ? (
        <>
          <SectionTitle>Your response</SectionTitle>
          <View style={ui.card}>
            <View style={s.claimHead}>
              <Text style={[s.claimName, { flex: 1 }]}>Sent {timeAgo(myClaim.created_at)}</Text>
              <StatusPill status={myClaim.status} />
            </View>
            <Text style={[ui.body, { marginTop: 10 }]}>{myClaim.message}</Text>
            {myClaim.status === 'pending' ? <Text style={[ui.hint, { marginTop: 12 }]}>Waiting for {item.poster_name} to review it.</Text> : null}
            {myClaim.status === 'rejected' ? <Text style={[ui.hint, { marginTop: 12 }]}>The poster didn't think this was a match.</Text> : null}
            {myClaim.status === 'approved' ? (
              <>
                <Text style={[ui.hint, { marginTop: 12 }]}>Approved. Contact {item.poster_name} to arrange the handover.</Text>
                <Contact email={posterContact?.email} phone={posterContact?.phone} />
              </>
            ) : null}
          </View>
        </>
      ) : !resolved ? (
        <>
          <SectionTitle>{isFound ? 'Is this yours?' : 'Did you find this?'}</SectionTitle>
          <Text style={[ui.muted, { marginBottom: 14 }]}>
            {isFound
              ? 'Describe something that isn\'t in the post, like a mark, the contents or the lock screen, so the finder can check it\'s yours.'
              : 'Tell the owner where you found it and where it is now.'}
          </Text>
          <Field
            value={message} onChangeText={setMessage} multiline
            placeholder={isFound ? 'e.g. There\'s a sticker on the back and a crack near the port' : 'e.g. Found it in Room 204, handed to the security desk'}
            hint="Your email and phone are shared only if the poster approves."
          />
          <Button title={isFound ? 'Claim this item' : 'I found this'} onPress={sendClaim} loading={busy} />
        </>
      ) : null}
    </ScrollView>
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
  hero: { width: '100%', height: 260, marginBottom: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  time: { fontFamily: font.regular, fontSize: 12, color: c.faint },
  title: { fontFamily: font.bold, fontSize: 24, color: c.text, letterSpacing: -0.5, marginBottom: 8 },
  poster: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 4 },
  posterName: { fontFamily: font.semibold, fontSize: 15, color: c.text },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  claimHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimName: { fontFamily: font.semibold, fontSize: 14, color: c.text },
});

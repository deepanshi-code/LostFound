import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { font, useStyles, useTheme } from '../theme';
import { Banner, Button, ErrorText, Field, Segmented, useUi } from '../ui';

const RESEND_SECONDS = 60;

const COPY = {
  login: ['Welcome back', 'Log in to report and find items on campus.'],
  register: ['Create your account', 'Use your college email so only students and staff can join.'],
  verify: ['Check your email', 'Enter the 6-digit code we sent you.'],
  forgot: ['Reset your password', "Enter your email and we'll send you a code."],
  reset: ['Choose a new password', 'Enter the code from your email and a new password.'],
};

// step: 'login' | 'register' | 'verify' | 'forgot' | 'reset'
export default function AuthScreen() {
  const { signIn } = useAuth();
  const { colors: c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useUi();
  const [step, setStep] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', code: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [domains, setDomains] = useState([]); // e.g. ['geu.ac.in'], empty = any email allowed

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    api('/auth/config').then((cfg) => setDomains(cfg.allowedDomains || [])).catch(() => {});
  }, []);
  const domainText = domains.map((d) => '@' + d).join(' or ');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (next, message = '') => {
    setStep(next);
    setError('');
    setNotice(message);
    setForm((f) => ({ ...f, code: '', password: next === 'reset' ? '' : f.password }));
  };

  // Runs a request with spinner + error handling
  const attempt = (fn) => async () => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (e.data?.needsVerification) {
        // Logged in with the right password but the email isn't verified yet
        set('email')(e.data.email);
        go('verify', e.data.warning || e.message);
        setResendIn(RESEND_SECONDS);
      } else {
        if (e.data?.retryAfter) setResendIn(e.data.retryAfter);
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const login = attempt(() => signIn('login', { email: form.email, password: form.password }));

  const register = attempt(async () => {
    const res = await signIn('register', form);
    set('email')(res.email);
    go('verify', res.warning || `We sent a 6-digit code to ${res.email}.`);
    setResendIn(RESEND_SECONDS);
  });

  const verify = attempt(() => signIn('verify', { email: form.email, code: form.code }));

  const forgot = attempt(async () => {
    if (!form.email.trim()) throw new Error('Enter the email you signed up with');
    await api('/auth/forgot', { method: 'POST', body: { email: form.email } });
    go('reset', `If ${form.email.trim()} has an account, a reset code is on its way.`);
    setResendIn(RESEND_SECONDS);
  });

  const reset = attempt(() => signIn('reset', { email: form.email, code: form.code, password: form.password }));

  const resend = attempt(async () => {
    const purpose = step === 'reset' ? 'reset' : 'verify';
    await api('/auth/resend', { method: 'POST', body: { email: form.email, purpose } });
    setNotice('A new code is on its way. Check your spam folder too.');
    setResendIn(RESEND_SECONDS);
  });

  const isCodeStep = step === 'verify' || step === 'reset';
  const [title, subtitle] = COPY[step];

  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.logo}><Ionicons name="search" size={20} color={c.onPrimary} /></View>
            <Text style={s.brandName}>Campus Lost & Found</Text>
          </View>

          {step !== 'login' && step !== 'register' ? (
            <Pressable onPress={() => go('login')} style={s.back} hitSlop={8}>
              <Ionicons name="arrow-back" size={18} color={c.muted} />
              <Text style={s.backText}>Back to log in</Text>
            </Pressable>
          ) : null}

          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>

          {step === 'login' || step === 'register' ? (
            <View style={{ marginBottom: 24 }}>
              <Segmented
                options={[{ value: 'login', label: 'Log in' }, { value: 'register', label: 'Sign up' }]}
                value={step}
                onChange={(m) => go(m)}
              />
            </View>
          ) : null}

          {notice ? <Banner tone="info" icon="mail-unread-outline">{notice}</Banner> : null}

          {step === 'register' ? (
            <>
              <Field label="Full name" icon="person-outline" value={form.name} onChangeText={set('name')} placeholder="Your name" autoComplete="name" />
              <Field
                label="Phone (optional)" icon="call-outline" value={form.phone} onChangeText={set('phone')}
                placeholder="Shared only when you approve a match" keyboardType="phone-pad"
              />
            </>
          ) : null}

          {step === 'login' || step === 'register' || step === 'forgot' ? (
            <Field
              label={step === 'register' ? 'College email' : 'Email'} icon="mail-outline"
              value={form.email} onChangeText={set('email')}
              placeholder={domains.length ? `you@${domains[0]}` : 'you@college.edu'}
              hint={step === 'register' && domains.length ? `Only ${domainText} addresses can sign up. We'll send a code to verify it.` : null}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email"
              onSubmitEditing={step === 'forgot' ? forgot : undefined}
            />
          ) : (
            <Text style={s.sentTo}>Code sent to <Text style={s.sentEmail}>{form.email}</Text></Text>
          )}

          {isCodeStep ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={ui.label}>Verification code</Text>
              <TextInput
                value={form.code}
                onChangeText={(v) => set('code')(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={c.border}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                style={s.codeInput}
                onSubmitEditing={step === 'verify' ? verify : undefined}
              />
            </View>
          ) : null}

          {step === 'login' || step === 'register' || step === 'reset' ? (
            <Field
              label={step === 'reset' ? 'New password' : 'Password'} icon="lock-closed-outline" secure
              value={form.password} onChangeText={set('password')}
              placeholder={step === 'login' ? 'Your password' : 'At least 8 characters'}
              hint={step === 'login' ? null : 'Use 8 or more characters with a letter and a number.'}
              onSubmitEditing={step === 'login' ? login : step === 'reset' ? reset : register}
            />
          ) : null}

          {step === 'login' ? (
            <Pressable onPress={() => go('forgot')} style={s.forgot} hitSlop={8}>
              <Text style={s.link}>Forgot password?</Text>
            </Pressable>
          ) : null}

          <ErrorText>{error}</ErrorText>

          {step === 'login' ? <Button title="Log in" onPress={login} loading={busy} /> : null}
          {step === 'register' ? <Button title="Create account" onPress={register} loading={busy} /> : null}
          {step === 'verify' ? <Button title="Verify email" onPress={verify} loading={busy} disabled={form.code.length !== 6} /> : null}
          {step === 'forgot' ? <Button title="Send code" onPress={forgot} loading={busy} /> : null}
          {step === 'reset' ? <Button title="Update password" onPress={reset} loading={busy} disabled={form.code.length !== 6} /> : null}

          {isCodeStep ? (
            <View style={s.resendRow}>
              <Text style={ui.muted}>Didn't get it? </Text>
              <Pressable onPress={resendIn > 0 || busy ? null : resend} disabled={resendIn > 0} hitSlop={8}>
                <Text style={[s.link, resendIn > 0 && { color: c.faint }]}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {isCodeStep ? <Text style={[ui.hint, { textAlign: 'center' }]}>Check your spam or promotions folder too.</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => ({
  container: { padding: 24, paddingTop: 40, paddingBottom: 48, maxWidth: 420, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: font.semibold, fontSize: 16, color: c.text, letterSpacing: -0.2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start' },
  backText: { fontFamily: font.medium, fontSize: 14, color: c.muted },
  title: { fontFamily: font.bold, fontSize: 28, color: c.text, letterSpacing: -0.7 },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: c.muted, marginTop: 8, marginBottom: 28, lineHeight: 22 },
  sentTo: { fontFamily: font.regular, fontSize: 14, color: c.muted, marginBottom: 16 },
  sentEmail: { fontFamily: font.semibold, color: c.text },
  codeInput: {
    backgroundColor: c.surface, borderRadius: 12, height: 60,
    fontFamily: font.semibold, fontSize: 28, letterSpacing: 14, textAlign: 'center', color: c.text,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 20 },
  link: { fontFamily: font.semibold, fontSize: 14, color: c.primary },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 8 },
});

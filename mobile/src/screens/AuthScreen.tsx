import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { requestOtp, verifyOtp, getProfile } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { ProfileData } from '../types/auth';

type Step = 'email' | 'otp';

export default function AuthScreen() {
  const { setAuth, setProfile } = useAuthStore();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);

  async function handleSendCode() {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestOtp(trimmed);
      setDevOtp(res.devOtp ?? null);
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otp.trim();
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(email.toLowerCase().trim(), code);
      // Fetch full profile to hydrate store
      try {
        const profileRes = await getProfile(res.token);
        if (profileRes.profile) {
          setProfile(profileRes.profile as ProfileData);
        }
      } catch {
        // Profile fetch failed — navigator will route to onboarding
      }
      // setAuth last so navigation fires after profile is stored
      setAuth(res.token, res.user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed. Try again.');
      setLoading(false);
    }
  }

  function handleResend() {
    setOtp('');
    setError(null);
    setStep('email');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

          {/* Back arrow when on OTP step */}
          {step === 'otp' && (
            <Pressable
              style={styles.backBtn}
              onPress={handleResend}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color="#9B9BB4" />
              <Text style={styles.backText}>Change email</Text>
            </Pressable>
          )}

          <View style={styles.content}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {step === 'email' ? 'Sign in to\nFitFlow AI' : 'Check your\ninbox'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'email'
                  ? "We'll send you a one-time sign-in code."
                  : `Code sent to ${email}`}
              </Text>
            </View>

            {/* Dev OTP banner */}
            {devOtp && (
              <View style={styles.devBanner}>
                <Ionicons name="code-slash" size={14} color="#C77DFF" />
                <Text style={styles.devText}>Dev mode — your code: {devOtp}</Text>
              </View>
            )}

            {/* Error banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={14} color="#FF6B35" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Input */}
            {step === 'email' ? (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder="you@example.com"
                  placeholderTextColor="#444466"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                />
              </View>
            ) : (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>6-digit code</Text>
                <TextInput
                  ref={otpInputRef}
                  style={[styles.input, styles.otpInput]}
                  value={otp}
                  onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                  placeholder="000000"
                  placeholderTextColor="#444466"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>
            )}

            {/* Primary CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (loading) && styles.primaryBtnDisabled,
                pressed && { opacity: 0.88 },
              ]}
              onPress={step === 'email' ? handleSendCode : handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {step === 'email' ? 'Send Code' : 'Verify & Sign In'}
                </Text>
              )}
            </Pressable>

            {/* Resend link */}
            {step === 'otp' && (
              <Pressable
                style={({ pressed }) => [styles.resendBtn, pressed && { opacity: 0.7 }]}
                onPress={handleResend}
              >
                <Text style={styles.resendText}>Didn't get it? Resend code</Text>
              </Pressable>
            )}

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safe: { flex: 1 },
  flex: { flex: 1 },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backText: { color: '#9B9BB4', fontSize: 14 },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 20,
  },

  header: { gap: 8, marginBottom: 4 },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: { color: '#666688', fontSize: 15, lineHeight: 22 },

  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A0E2A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C77DFF30',
  },
  devText: { color: '#C77DFF', fontSize: 13, fontWeight: '600', flex: 1 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A0E08',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF6B3530',
  },
  errorText: { color: '#FF6B35', fontSize: 13, flex: 1 },

  inputWrap: { gap: 8 },
  inputLabel: { color: '#9B9BB4', fontSize: 13, fontWeight: '600' },
  input: {
    height: 56,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontSize: 17,
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },

  primaryBtn: {
    height: 58,
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});

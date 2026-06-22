import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

export function useWorkoutAudio() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const hapticsEnabledRef = useRef(hapticsEnabled);
  hapticsEnabledRef.current = hapticsEnabled;

  const speak = useCallback((text: string) => {
    if (!voiceEnabledRef.current) return;
    // Stop any in-progress utterance before starting a new one
    Speech.stop();
    Speech.speak(text, { rate: 0.92, pitch: 1.0 });
  }, []);

  const hapticPulse = useCallback(() => {
    if (!hapticsEnabledRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const hapticSuccess = useCallback(() => {
    if (!hapticsEnabledRef.current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const hapticHeavy = useCallback(() => {
    if (!hapticsEnabledRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, []);

  // Called on interval change — speaks the exercise name
  const announceInterval = useCallback(
    (label: string, type: 'work' | 'rest') => {
      const cue = type === 'rest' ? `Rest. ${label}` : `Next, ${label}`;
      speak(cue);
      hapticPulse();
    },
    [speak, hapticPulse],
  );

  // Called by the engine onCountdown(3|2|1)
  const announceCountdown = useCallback(
    (n: number) => {
      speak(String(n));
      hapticPulse();
    },
    [speak, hapticPulse],
  );

  const announceHalfway = useCallback(() => {
    speak('Halfway done, keep going!');
  }, [speak]);

  const announceComplete = useCallback(() => {
    speak('Workout complete. Great job!');
    hapticSuccess();
  }, [speak, hapticSuccess]);

  return {
    voiceEnabled,
    setVoiceEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    announceInterval,
    announceCountdown,
    announceHalfway,
    announceComplete,
    hapticHeavy,
  };
}

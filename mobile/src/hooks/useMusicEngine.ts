import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// ── Music profile types ───────────────────────────────────────────────────────

export type MusicVibe = 'energetic' | 'moderate' | 'calm';

export interface MusicProfile {
  id: string;
  label: string;           // e.g. "Trap Boost"
  genre: string;           // e.g. "Trap / EDM"
  vibe: MusicVibe;
  bpm: number;
  ageGroup: AgeGroup;
  emoji: string;
  accentColor: string;
}

type AgeGroup = 'youth' | 'young_adult' | 'adult' | 'senior';

// ── Profile catalog (4 age groups × 3 vibes = 12 profiles) ───────────────────

const CATALOG: Record<AgeGroup, Record<MusicVibe, MusicProfile>> = {
  youth: {
    energetic: {
      id: 'youth-energetic', label: 'Trap Boost', genre: 'Trap / EDM',
      vibe: 'energetic', bpm: 138, ageGroup: 'youth', emoji: '⚡', accentColor: '#C77DFF',
    },
    moderate: {
      id: 'youth-moderate', label: 'Pop Drive', genre: 'Upbeat Pop',
      vibe: 'moderate', bpm: 118, ageGroup: 'youth', emoji: '🎵', accentColor: '#FF6B9D',
    },
    calm: {
      id: 'youth-calm', label: 'Lo-fi Chill', genre: 'Lo-fi Beats',
      vibe: 'calm', bpm: 78, ageGroup: 'youth', emoji: '🌙', accentColor: '#7B9CFF',
    },
  },
  young_adult: {
    energetic: {
      id: 'ya-energetic', label: 'EDM Rush', genre: 'Electronic Dance',
      vibe: 'energetic', bpm: 128, ageGroup: 'young_adult', emoji: '🔥', accentColor: '#FF6B35',
    },
    moderate: {
      id: 'ya-moderate', label: 'Hip-Hop Drive', genre: 'Hip-Hop',
      vibe: 'moderate', bpm: 108, ageGroup: 'young_adult', emoji: '🎤', accentColor: '#4ECDC4',
    },
    calm: {
      id: 'ya-calm', label: 'Ambient Flow', genre: 'Ambient',
      vibe: 'calm', bpm: 70, ageGroup: 'young_adult', emoji: '🌊', accentColor: '#6C63FF',
    },
  },
  adult: {
    energetic: {
      id: 'adult-energetic', label: 'Rock Power', genre: 'Classic Rock',
      vibe: 'energetic', bpm: 118, ageGroup: 'adult', emoji: '🎸', accentColor: '#FF4444',
    },
    moderate: {
      id: 'adult-moderate', label: 'Pop Steady', genre: 'Pop / Funk',
      vibe: 'moderate', bpm: 100, ageGroup: 'adult', emoji: '🎺', accentColor: '#FFB347',
    },
    calm: {
      id: 'adult-calm', label: 'Smooth Groove', genre: 'Jazz / Soul',
      vibe: 'calm', bpm: 66, ageGroup: 'adult', emoji: '🎷', accentColor: '#98D8C8',
    },
  },
  senior: {
    energetic: {
      id: 'senior-energetic', label: 'Classic Swing', genre: 'Big Band Swing',
      vibe: 'energetic', bpm: 96, ageGroup: 'senior', emoji: '🎼', accentColor: '#F9CA24',
    },
    moderate: {
      id: 'senior-moderate', label: 'Easy Beat', genre: 'Easy Listening',
      vibe: 'moderate', bpm: 84, ageGroup: 'senior', emoji: '🎹', accentColor: '#A29BFE',
    },
    calm: {
      id: 'senior-calm', label: 'Gentle Melody', genre: 'Classical',
      vibe: 'calm', bpm: 58, ageGroup: 'senior', emoji: '🕊️', accentColor: '#DFE6E9',
    },
  },
};

// ── Profile selection logic ───────────────────────────────────────────────────

function ageToGroup(age: number | null | undefined): AgeGroup {
  if (!age || age < 13) return 'young_adult';
  if (age <= 20) return 'youth';
  if (age <= 35) return 'young_adult';
  if (age <= 55) return 'adult';
  return 'senior';
}

function categoryToVibe(category: string): MusicVibe {
  const c = category.toLowerCase();
  if (c.includes('yoga') || c.includes('flex') || c.includes('stretch') || c.includes('mobility')) {
    return 'calm';
  }
  if (c.includes('walk') || c.includes('jog') || c.includes('cardio') || c.includes('run')) {
    return 'moderate';
  }
  return 'energetic'; // hiit, tabata, strength, default
}

export function getMusicProfile(age: number | null | undefined, category: string): MusicProfile {
  return CATALOG[ageToGroup(age)][categoryToVibe(category)];
}

export function getAgeGroupLabel(age: number | null | undefined): string {
  const g = ageToGroup(age);
  return { youth: 'Youth (13–20)', young_adult: 'Young Adult (21–35)', adult: 'Adult (36–55)', senior: 'Senior (56+)' }[g];
}

// ── Web Audio beat engine ─────────────────────────────────────────────────────
// Runs only on web (Platform.OS === 'web'). Gracefully no-ops on native.
// Uses a look-ahead scheduler pattern for glitch-free audio timing.

const LOOK_AHEAD_SEC = 0.12;  // schedule this far ahead
const SCHEDULER_MS   = 28;    // how often the scheduler runs

// MIDI note → Hz
function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Rhythm patterns for a 16-step bar (kick, snare, hihat, bass melody note index)
interface Pattern {
  kick:   number[];  // which of 16 steps get a kick
  snare:  number[];  // snare/clap steps
  hihat:  number[];  // closed hi-hat steps
  bass:   number[];  // which steps get a bass note (-1 = rest)
  melody: number[];  // melody note index (-1 = rest) over 16 steps
}

const PATTERNS: Record<MusicVibe, Pattern> = {
  energetic: {
    kick:   [0, 2, 4, 6, 8, 10, 12, 14],             // 8th-note kicks (driving)
    snare:  [4, 12],                                   // 2 & 4
    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], // 16th-note hats
    bass:   [0,-1,3,-1,8,-1,11,-1,0,-1,3,-1,8,-1,11,-1],
    melody: [0,-1,-1,2,-1,-1,4,-1,3,-1,-1,2,-1,-1,0,-1],
  },
  moderate: {
    kick:   [0, 8],                                   // 1 & 3
    snare:  [4, 12],                                  // 2 & 4
    hihat:  [0,2,4,6,8,10,12,14],                     // 8th-note hats
    bass:   [0,-1,-1,-1,7,-1,-1,-1,5,-1,-1,-1,3,-1,-1,-1],
    melody: [0,-1,2,-1,4,-1,2,-1,0,-1,4,-1,7,-1,4,-1],
  },
  calm: {
    kick:   [0],                                       // just beat 1
    snare:  [8],                                       // half bar
    hihat:  [0, 4, 8, 12],                             // quarter-note hats
    bass:   [0,-1,-1,-1,-1,-1,-1,-1,5,-1,-1,-1,-1,-1,-1,-1],
    melody: [0,-1,-1,-1,4,-1,-1,-1,7,-1,-1,-1,4,-1,-1,-1],
  },
};

// Scale notes (semitones above root) per age group
const SCALES: Record<AgeGroup, number[]> = {
  youth:       [0, 3, 5, 7, 10, 12, 15],  // minor pentatonic – edgy
  young_adult: [0, 2, 3, 5, 7, 10, 12],   // natural minor – cool
  adult:       [0, 2, 4, 7, 9, 12, 14],   // major pentatonic – classic
  senior:      [0, 2, 4, 5, 7, 9, 11],    // major – warm/bright
};

// Root MIDI note for bass line per age group
const BASS_ROOT: Record<AgeGroup, number> = {
  youth:       33,  // A1 – sub-bass
  young_adult: 36,  // C2 – electronic bass
  adult:       40,  // E2 – guitar bass
  senior:      45,  // A2 – warm upright feel
};

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private running = false;
  private barCount = 0;

  // Current config (updated via setProfile)
  private bpm = 120;
  private vibe: MusicVibe = 'energetic';
  private ageGroup: AgeGroup = 'young_adult';
  private targetGain = 0.65;

  // ── Boot (requires user gesture) ────────────────────────────────────────────
  boot() {
    if (typeof window === 'undefined' || !(window as any).AudioContext && !(window as any).webkitAudioContext) return;
    if (this.ctx) return;
    const AC: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);
  }

  setProfile(profile: MusicProfile, isWork: boolean) {
    // During rest: half BPM, calm vibe, lower gain
    this.bpm       = isWork ? profile.bpm : Math.max(50, Math.round(profile.bpm * 0.55));
    this.vibe      = isWork ? profile.vibe : 'calm';
    this.ageGroup  = profile.ageGroup;
    this.targetGain = isWork ? 0.65 : 0.28;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.running ? this.targetGain : 0, this.ctx.currentTime, 0.3);
    }
  }

  start() {
    if (!this.ctx) this.boot();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.running = true;
    this.step = 0;
    this.barCount = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.targetGain, this.ctx.currentTime, 0.2);
    }
    this.schedule();
  }

  pause() {
    this.running = false;
    if (this.schedulerTimer) { clearTimeout(this.schedulerTimer); this.schedulerTimer = null; }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  resume() {
    if (!this.ctx || this.running) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.running = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.targetGain, this.ctx.currentTime, 0.2);
    }
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.schedulerTimer) { clearTimeout(this.schedulerTimer); this.schedulerTimer = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; this.masterGain = null; }
  }

  // ── Scheduler ────────────────────────────────────────────────────────────────
  private schedule() {
    if (!this.ctx || !this.running) return;
    while (this.nextNoteTime < this.ctx.currentTime + LOOK_AHEAD_SEC) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.advance();
    }
    this.schedulerTimer = setTimeout(() => this.schedule(), SCHEDULER_MS);
  }

  private advance() {
    const secPer16th = 60 / this.bpm / 4;
    this.nextNoteTime += secPer16th;
    this.step = (this.step + 1) % 16;
    if (this.step === 0) this.barCount++;
  }

  // ── Note scheduler ────────────────────────────────────────────────────────────
  private scheduleStep(step: number, time: number) {
    const pattern = PATTERNS[this.vibe];
    const isFill = this.barCount > 0 && this.barCount % 8 === 7; // fill on bar 8

    if (pattern.kick.includes(step)) {
      this.kick(time, this.vibe === 'energetic' ? 0.9 : 0.65);
    }

    if (pattern.snare.includes(step)) {
      this.snare(time, this.vibe === 'calm' ? 0.35 : 0.7);
    }

    if (pattern.hihat.includes(step)) {
      const vol = step % 2 === 0 ? 0.4 : 0.2;  // accent on even steps
      const isOpen = isFill && step === 15;
      this.hiHat(time, vol, isOpen);
    }

    // Bass
    const bassNote = pattern.bass[step];
    if (bassNote !== -1) {
      const rootMidi = BASS_ROOT[this.ageGroup] + bassNote;
      this.bass(time, freq(rootMidi), this.vibe === 'calm' ? 0.35 : 0.55);
    }

    // Melody (only on work/energetic, and only after first 2 bars)
    if (this.vibe !== 'calm' && this.barCount >= 2) {
      const melIdx = pattern.melody[step];
      if (melIdx !== -1) {
        const scale = SCALES[this.ageGroup];
        const noteOffset = scale[melIdx % scale.length];
        const root = BASS_ROOT[this.ageGroup] + 24; // 2 octaves up
        this.melody(time, freq(root + noteOffset), this.vibe === 'energetic' ? 0.22 : 0.18);
      }
    }

    // Fill: extra snare roll on last 4 steps of fill bar
    if (isFill && step >= 12) {
      this.snare(time + 0.01, 0.45);
    }
  }

  // ── Instrument synthesisers ──────────────────────────────────────────────────

  private kick(time: number, gain: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.connect(env); env.connect(this.masterGain);
    osc.frequency.setValueAtTime(this.vibe === 'energetic' ? 160 : 120, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.start(time); osc.stop(time + 0.14);
  }

  private snare(time: number, gain: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufLen = Math.round(this.ctx.sampleRate * 0.09);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hpf = this.ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 900;
    const env = this.ctx.createGain();
    src.connect(hpf); hpf.connect(env); env.connect(this.masterGain);
    env.gain.setValueAtTime(gain, time); env.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    src.start(time); src.stop(time + 0.09);
    // Tonal body
    const osc = this.ctx.createOscillator(); const env2 = this.ctx.createGain();
    osc.frequency.value = 200; osc.connect(env2); env2.connect(this.masterGain);
    env2.gain.setValueAtTime(gain * 0.4, time); env2.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time); osc.stop(time + 0.05);
  }

  private hiHat(time: number, gain: number, isOpen = false) {
    if (!this.ctx || !this.masterGain) return;
    const dur = isOpen ? 0.25 : 0.04;
    const bufLen = Math.round(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const hpf = this.ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
    const env = this.ctx.createGain();
    src.connect(hpf); hpf.connect(env); env.connect(this.masterGain);
    env.gain.setValueAtTime(gain, time); env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.start(time); src.stop(time + dur);
  }

  private bass(time: number, hz: number, gain: number) {
    if (!this.ctx || !this.masterGain) return;
    const dur = this.vibe === 'calm' ? 0.6 : 0.3;
    const osc = this.ctx.createOscillator(); const env = this.ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = hz;
    osc.connect(env); env.connect(this.masterGain);
    env.gain.setValueAtTime(gain, time); env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time); osc.stop(time + dur);
  }

  private melody(time: number, hz: number, gain: number) {
    if (!this.ctx || !this.masterGain) return;
    const dur = this.vibe === 'moderate' ? 0.3 : 0.12;
    const osc = this.ctx.createOscillator(); const env = this.ctx.createGain();
    osc.type = this.ageGroup === 'senior' ? 'sine' : 'square';
    osc.frequency.value = hz;
    const lpf = this.ctx.createBiquadFilter(); lpf.type = 'lowpass';
    lpf.frequency.value = this.ageGroup === 'youth' ? 3000 : 1400;
    osc.connect(lpf); lpf.connect(env); env.connect(this.masterGain);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time); osc.stop(time + dur);
  }
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useMusicEngine(profile: MusicProfile | null, isWork: boolean) {
  const engineRef = useRef<WebAudioEngine | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const isWebRef = useRef(Platform.OS === 'web');

  // Create engine once (web only)
  useEffect(() => {
    if (!isWebRef.current) return;
    engineRef.current = new WebAudioEngine();
    return () => { engineRef.current?.stop(); };
  }, []);

  // React to interval changes (work ↔ rest)
  useEffect(() => {
    if (!musicEnabled || !profile || !isWebRef.current) return;
    engineRef.current?.setProfile(profile, isWork);
  }, [isWork, profile, musicEnabled]);

  const toggleMusic = useCallback(() => {
    if (!isWebRef.current) return;
    setMusicEnabled((prev) => {
      const next = !prev;
      if (next && profile) {
        engineRef.current?.boot();
        engineRef.current?.setProfile(profile, isWork);
        engineRef.current?.start();
      } else {
        engineRef.current?.pause();
      }
      return next;
    });
  }, [profile, isWork]);

  // Pause music when workout pauses, resume when it resumes
  const pauseMusic  = useCallback(() => { if (musicEnabled) engineRef.current?.pause();  }, [musicEnabled]);
  const resumeMusic = useCallback(() => { if (musicEnabled) engineRef.current?.resume(); }, [musicEnabled]);
  const stopMusic   = useCallback(() => { engineRef.current?.pause(); setMusicEnabled(false); }, []);

  const isWebPlatform = isWebRef.current;

  return { musicEnabled, toggleMusic, pauseMusic, resumeMusic, stopMusic, isWebPlatform };
}

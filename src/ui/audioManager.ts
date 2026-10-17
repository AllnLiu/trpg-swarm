/**
 * @fileoverview Zero-Server Procedural Web Audio Synthesizer for Multi-Agent TRPG VTT.
 * Uses pure native Web Audio API (OscillatorNode, AudioBuffer white noise, BiquadFilterNode,
 * GainNode) with zero external MP3/WAV dependencies.
 */

export type AmbientBgmMode = 'dungeon' | 'combat' | 'investigation' | 'tavern';

export class TrpgAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentBgmMode: AmbientBgmMode | null = null;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  /**
   * Lazily initializes or resumes the Web Audio API context.
   */
  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.18;
        this.bgmGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Generates a white noise buffer of a given duration in seconds.
   */
  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Toggles global mute state and stops BGM if muted.
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAmbientBGM();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentBgmMode(): AmbientBgmMode | null {
    return this.currentBgmMode;
  }

  /**
   * Simulates polyhedral dice bouncing and colliding on a wooden tray.
   * Uses bandpass-filtered short noise impulses + wood/plastic resonant clicks
   * with decaying intervals and frequencies.
   */
  public playDiceRoll(diceCount: number = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const clampedCount = Math.min(Math.max(diceCount, 1), 6);
    const bounces = 5 + clampedCount * 2;
    let timeOffset = 0;

    for (let i = 0; i < bounces; i++) {
      const progress = i / bounces;
      const startTime = ctx.currentTime + timeOffset;
      timeOffset += 0.028 + progress * 0.065 + Math.random() * 0.018;

      // Short noise click through bandpass filter (dice edge impact)
      const noiseDur = 0.025;
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.createNoiseBuffer(ctx, noiseDur);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 1200 - progress * 500, startTime);
      filter.Q.setValueAtTime(6.0, startTime);

      const gain = ctx.createGain();
      const peakGain = (0.35 * (1 - progress * 0.75)) / Math.sqrt(clampedCount);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDur);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(startTime);
      noiseSource.stop(startTime + noiseDur);

      // Subtle wooden tray body resonance (Triangle oscillator burst)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 320 + Math.random() * 180 - progress * 90;
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, startTime + 0.022);

      oscGain.gain.setValueAtTime(peakGain * 0.6, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.022);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.024);
    }
  }

  /**
   * Radiant major triad arpeggio ascending with overtones (C5-E5-G5-C6 Triangle + Sine).
   */
  public playCriticalSuccess(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.075;
      const duration = 0.55;

      // Primary Triangle wave
      const triOsc = ctx.createOscillator();
      triOsc.type = 'triangle';
      triOsc.frequency.setValueAtTime(freq, startTime);

      // Harmonic Sine wave one octave higher
      const sineOsc = ctx.createOscillator();
      sineOsc.type = 'sine';
      sineOsc.frequency.setValueAtTime(freq * 2, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.08, startTime);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      triOsc.connect(gain);
      sineOsc.connect(harmonicGain);
      gain.connect(this.masterGain!);
      harmonicGain.connect(this.masterGain!);

      triOsc.start(startTime);
      triOsc.stop(startTime + duration);
      sineOsc.start(startTime);
      sineOsc.stop(startTime + duration);
    });
  }

  /**
   * Deep dissonant chromatic downward pitch sweep (Sawtooth 180Hz -> 55Hz).
   */
  public playCriticalFailure(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 0.75;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Dissonant tritone / minor second interval sweeping down
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + duration);

    osc2.frequency.setValueAtTime(170, now);
    osc2.frequency.exponentialRampToValueAtTime(51.9, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * High-frequency white noise sweep + metallic blade ring overtones.
   */
  public playSwordSlash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 0.28;

    // 1. Air whoosh / blade cut noise sweep
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, now);
    filter.frequency.setValueAtTime(3600, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.025);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);

    // 2. Metallic steel resonance ping
    const metalFreqs = [1980, 2890, 4120];
    metalFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.22);

      const mg = ctx.createGain();
      mg.gain.setValueAtTime(0.08 / (i + 1), now);
      mg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(mg);
      mg.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.23);
    });
  }

  /**
   * Exponentially decaying white noise + lowpass filter frequency sweep (800Hz -> 60Hz)
   * with sub-bass impact boom.
   */
  public playFireballExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 1.15;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, duration);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(800, now);
    lowpass.frequency.exponentialRampToValueAtTime(60, now + duration);
    lowpass.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);

    // Sub-bass shockwave thump
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.55);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.56);
  }

  /**
   * Warm sine wave fifth harmonic resonance + high-frequency starlight shimmer chimes.
   */
  public playHealChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Warm fifth chord (F4 - C5 - A5)
    const warmChord = [349.23, 523.25, 880.0];
    warmChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.96);
    });

    // High-frequency celestial sparkles
    const sparkles = [1567.98, 2093.0, 2637.02, 3135.96];
    sparkles.forEach((freq, idx) => {
      const start = now + 0.08 + idx * 0.065;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.09, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.43);
    });
  }

  /**
   * Call of Cthulhu Sanity check failure: eerie binaural low-frequency beating drone
   * + piercing high-frequency tinnitus ringing (3200Hz).
   */
  public playSanityShock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 1.45;

    // Eerie low binaural beat (62Hz vs 68.5Hz)
    const low1 = ctx.createOscillator();
    const low2 = ctx.createOscillator();
    low1.type = 'sawtooth';
    low2.type = 'triangle';
    low1.frequency.setValueAtTime(62, now);
    low2.frequency.setValueAtTime(68.5, now);

    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(210, now);

    const lowGain = ctx.createGain();
    lowGain.gain.setValueAtTime(0.001, now);
    lowGain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    low1.connect(lowFilter);
    low2.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(this.masterGain);

    low1.start(now);
    low2.start(now);
    low1.stop(now + duration);
    low2.stop(now + duration);

    // High-frequency Tinnitus Ringing (3200Hz Sine)
    const tinnitus = ctx.createOscillator();
    tinnitus.type = 'sine';
    tinnitus.frequency.setValueAtTime(3200, now);

    const tinGain = ctx.createGain();
    tinGain.gain.setValueAtTime(0.001, now);
    tinGain.gain.linearRampToValueAtTime(0.11, now + 0.04);
    tinGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    tinnitus.connect(tinGain);
    tinGain.connect(this.masterGain);
    tinnitus.start(now);
    tinnitus.stop(now + duration);
  }

  /**
   * Starts multi-voice procedural ambient background music arpeggiator.
   */
  public startAmbientBGM(mode: AmbientBgmMode): void {
    this.stopAmbientBGM();
    this.currentBgmMode = mode;
    if (this.isMuted) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.bgmGain) return;

    this.bgmStep = 0;
    const tempoMs: Record<AmbientBgmMode, number> = {
      dungeon: 520,
      combat: 240,
      investigation: 460,
      tavern: 340,
    };

    const playStep = () => {
      if (this.isMuted || !this.currentBgmMode) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx || !this.bgmGain) return;

      const step = this.bgmStep++;
      const now = audioCtx.currentTime;

      if (mode === 'dungeon') {
        // Dark Dorian / Phrygian ambient cavern drone + slow plucks
        const scale = [110.0, 130.81, 146.83, 164.81, 196.0, 220.0];
        const freq = scale[step % scale.length];
        this.triggerBgmNote(audioCtx, freq, 'sine', 0.48, 0.25);
        if (step % 4 === 0) {
          this.triggerBgmNote(audioCtx, 55.0, 'triangle', 1.8, 0.35);
        }
      } else if (mode === 'combat') {
        // Driving rhythmic ostinato in A minor / Phrygian dominant
        const bassPattern = [110.0, 110.0, 130.81, 110.0, 146.83, 130.81, 116.54, 98.0];
        const freq = bassPattern[step % bassPattern.length];
        this.triggerBgmNote(audioCtx, freq, 'sawtooth', 0.2, 0.28);
        if (step % 2 === 0) {
          this.triggerBgmNote(audioCtx, freq * 2, 'triangle', 0.15, 0.18);
        }
      } else if (mode === 'investigation') {
        // Mysterious whole-tone / diminished arpeggio (CoC detective mood)
        const mysteryNotes = [220.0, 261.63, 311.13, 369.99, 440.0, 311.13];
        const freq = mysteryNotes[step % mysteryNotes.length];
        this.triggerBgmNote(audioCtx, freq, 'sine', 0.42, 0.22);
      } else if (mode === 'tavern') {
        // Warm acoustic lute-like folk arpeggio (G major / E minor)
        const luteNotes = [196.0, 246.94, 293.66, 392.0, 329.63, 293.66, 246.94, 220.0];
        const freq = luteNotes[step % luteNotes.length];
        this.triggerBgmNote(audioCtx, freq, 'triangle', 0.3, 0.3);
      }
      void now;
    };

    playStep();
    if (typeof window !== 'undefined') {
      this.bgmIntervalId = window.setInterval(playStep, tempoMs[mode]);
    }
  }

  private triggerBgmNote(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number
  ): void {
    if (!this.bgmGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public stopAmbientBGM(): void {
    if (this.bgmIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.currentBgmMode = null;
  }
}

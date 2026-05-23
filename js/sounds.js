/**
 * @fileoverview Sound effects using Web Audio API (no external files needed)
 */

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  /**
   * Must be called once after a user interaction (browser security requirement).
   * Calling it on the Start Game button click is perfect.
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  /**
   * Core tone generator.
   * @param {number} frequency - Hz (e.g. 440 = A4)
   * @param {number} duration  - seconds
   * @param {string} type      - 'sine' | 'square' | 'sawtooth' | 'triangle'
   * @param {number} volume    - 0 to 1
   */
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;
    const osc  = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + duration);
  }

  /** Correct answer: ascending C5 → E5 → G5 */
  playCorrect() {
    this.playTone(523.25, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200);
  }

  /** Wrong answer: low sawtooth buzz */
  playWrong() {
    this.playTone(200, 0.3, 'sawtooth', 0.2);
  }

  /** Timer warning tick (called every second when ≤ 5s remain) */
  playWarning() {
    this.playTone(600, 0.1, 'square', 0.2);
  }

  /** Time's up: two descending tones */
  playTimeUp() {
    this.playTone(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.3), 200);
  }

  /** Quiz complete fanfare: C5 E5 G5 C6 */
  playComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 150);
    });
  }

  /** Toggle mute/unmute */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// Singleton — imported by quiz.js, question.js, and index.js
export const soundManager = new SoundManager();

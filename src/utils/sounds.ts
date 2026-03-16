// Web Audio API based animal sounds — realistic voices
const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

function createNoiseBuffer(duration: number): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playChickenSound() {
  const t = audioCtx.currentTime;
  // Bok-bok-bok: rapid pitched bursts with nasal quality
  for (let i = 0; i < 4; i++) {
    const start = t + i * 0.18;
    // Main voice
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 + Math.random() * 80, start);
    osc.frequency.exponentialRampToValueAtTime(350, start + 0.06);
    osc.frequency.exponentialRampToValueAtTime(300, start + 0.1);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
    // Bandpass for nasal quality
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 3;
    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.12);
  }
}

function playCowSound() {
  const t = audioCtx.currentTime;
  // Мууу: deep formant sweep with vibrato
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const vibrato = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  const gain1 = audioCtx.createGain();
  const gain2 = audioCtx.createGain();
  const lp = audioCtx.createBiquadFilter();

  // Vibrato
  vibrato.frequency.value = 5;
  vibratoGain.gain.value = 8;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc1.frequency);

  // Fundamental
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(120, t);
  osc1.frequency.linearRampToValueAtTime(140, t + 0.3);
  osc1.frequency.linearRampToValueAtTime(110, t + 1.2);
  osc1.frequency.linearRampToValueAtTime(95, t + 1.8);

  // Harmonic
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(240, t);
  osc2.frequency.linearRampToValueAtTime(280, t + 0.3);
  osc2.frequency.linearRampToValueAtTime(220, t + 1.2);

  // Low-pass for muffled quality
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(800, t + 0.3);
  lp.frequency.linearRampToValueAtTime(400, t + 1.5);
  lp.Q.value = 2;

  gain1.gain.setValueAtTime(0, t);
  gain1.gain.linearRampToValueAtTime(0.12, t + 0.15);
  gain1.gain.setValueAtTime(0.12, t + 0.8);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

  gain2.gain.setValueAtTime(0, t);
  gain2.gain.linearRampToValueAtTime(0.06, t + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(gain1);
  gain1.connect(audioCtx.destination);

  osc1.start(t);
  osc2.start(t);
  vibrato.start(t);
  osc1.stop(t + 2);
  osc2.stop(t + 2);
  vibrato.stop(t + 2);
}

function playPigSound() {
  const t = audioCtx.currentTime;
  // Хрю-хрю: nasal grunts with noise
  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.3;
    // Voice
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const bp = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180 + Math.random() * 30, start);
    osc.frequency.linearRampToValueAtTime(220 + Math.random() * 40, start + 0.08);
    osc.frequency.exponentialRampToValueAtTime(150, start + 0.2);

    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 2;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.25);

    // Nose noise
    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.15);
    const nGain = audioCtx.createGain();
    const nBp = audioCtx.createBiquadFilter();
    nBp.type = 'bandpass';
    nBp.frequency.value = 600;
    nBp.Q.value = 4;
    nGain.gain.setValueAtTime(0, start);
    nGain.gain.linearRampToValueAtTime(0.04, start + 0.02);
    nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    noise.connect(nBp);
    nBp.connect(nGain);
    nGain.connect(audioCtx.destination);
    noise.start(start);
    noise.stop(start + 0.15);
  }
}

function playSheepSound() {
  const t = audioCtx.currentTime;
  // Бее: strong vibrato bleating
  const osc = audioCtx.createOscillator();
  const vibrato = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  const gain = audioCtx.createGain();
  const bp = audioCtx.createBiquadFilter();

  // Strong vibrato for bleating
  vibrato.frequency.value = 12;
  vibratoGain.gain.value = 40;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(380, t + 0.15);
  osc.frequency.linearRampToValueAtTime(320, t + 0.5);
  osc.frequency.linearRampToValueAtTime(280, t + 0.9);

  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1200, t);
  bp.frequency.linearRampToValueAtTime(900, t + 0.5);
  bp.Q.value = 1.5;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
  gain.gain.setValueAtTime(0.12, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

  osc.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + 1.1);
  vibrato.stop(t + 1.1);
}

function playDuckSound() {
  const t = audioCtx.currentTime;
  // Кря-кря: nasal honk with noise burst
  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.22;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const bp = audioCtx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(280, start);
    osc.frequency.linearRampToValueAtTime(380, start + 0.04);
    osc.frequency.exponentialRampToValueAtTime(250, start + 0.14);

    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 3;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.1, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.16);

    // Noise for "quack" texture
    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.08);
    const nGain = audioCtx.createGain();
    const nBp = audioCtx.createBiquadFilter();
    nBp.type = 'bandpass';
    nBp.frequency.value = 2500;
    nBp.Q.value = 5;
    nGain.gain.setValueAtTime(0, start);
    nGain.gain.linearRampToValueAtTime(0.06, start + 0.01);
    nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
    noise.connect(nBp);
    nBp.connect(nGain);
    nGain.connect(audioCtx.destination);
    noise.start(start);
    noise.stop(start + 0.1);
  }
}

function playRabbitSound() {
  const t = audioCtx.currentTime;
  // Soft tiny squeaks — high pitch, quiet
  for (let i = 0; i < 2; i++) {
    const start = t + i * 0.25;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000 + Math.random() * 500, start);
    osc.frequency.exponentialRampToValueAtTime(1500, start + 0.12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.15);
  }
}

function playGoatSound() {
  const t = audioCtx.currentTime;
  // Меее: similar to sheep but higher and more aggressive vibrato
  const osc = audioCtx.createOscillator();
  const vibrato = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  const gain = audioCtx.createGain();
  const bp = audioCtx.createBiquadFilter();

  vibrato.frequency.value = 15;
  vibratoGain.gain.value = 50;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(500, t + 0.1);
  osc.frequency.linearRampToValueAtTime(420, t + 0.4);
  osc.frequency.linearRampToValueAtTime(350, t + 0.7);

  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1.5;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
  gain.gain.setValueAtTime(0.12, t + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  osc.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + 0.9);
  vibrato.stop(t + 0.9);
}

function playCatSound() {
  const t = audioCtx.currentTime;
  // Мяу: formant sweep — "m" → "ya" → "u"
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const gain2 = audioCtx.createGain();
  const formant1 = audioCtx.createBiquadFilter();
  const formant2 = audioCtx.createBiquadFilter();

  // Main voice
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(350, t);
  osc.frequency.linearRampToValueAtTime(550, t + 0.15);  // "ya" — rising
  osc.frequency.linearRampToValueAtTime(480, t + 0.4);
  osc.frequency.linearRampToValueAtTime(350, t + 0.7);   // "u" — falling

  // Formant 1 — mouth shape
  formant1.type = 'bandpass';
  formant1.frequency.setValueAtTime(500, t);       // "m" closed
  formant1.frequency.linearRampToValueAtTime(1200, t + 0.15); // "ya" open
  formant1.frequency.linearRampToValueAtTime(600, t + 0.6);   // "u" rounded
  formant1.Q.value = 3;

  // Formant 2
  formant2.type = 'peaking';
  formant2.frequency.setValueAtTime(2500, t);
  formant2.gain.value = 6;
  formant2.Q.value = 2;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  // Purr undertone
  osc2.type = 'triangle';
  osc2.frequency.value = 25;
  gain2.gain.setValueAtTime(0.02, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc.connect(formant1);
  formant1.connect(formant2);
  formant2.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc2.start(t);
  osc.stop(t + 0.9);
  osc2.stop(t + 0.9);
}

function playDogSound() {
  const t = audioCtx.currentTime;
  // Гав-гав: sharp bark with noise attack
  for (let i = 0; i < 2; i++) {
    const start = t + i * 0.35;

    // Bark voice
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lp = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, start);
    osc.frequency.linearRampToValueAtTime(250, start + 0.03);
    osc.frequency.exponentialRampToValueAtTime(180, start + 0.2);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2000, start);
    lp.frequency.exponentialRampToValueAtTime(800, start + 0.15);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.28);

    // Noise burst for attack
    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.05);
    const nGain = audioCtx.createGain();
    const nLp = audioCtx.createBiquadFilter();
    nLp.type = 'lowpass';
    nLp.frequency.value = 3000;
    nGain.gain.setValueAtTime(0, start);
    nGain.gain.linearRampToValueAtTime(0.08, start + 0.005);
    nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
    noise.connect(nLp);
    nLp.connect(nGain);
    nGain.connect(audioCtx.destination);
    noise.start(start);
    noise.stop(start + 0.06);
  }
}

function playGooseSound() {
  const t = audioCtx.currentTime;
  // Га-га-га: honking with nasal resonance
  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.25;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const bp = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, start);
    osc.frequency.linearRampToValueAtTime(300, start + 0.05);
    osc.frequency.exponentialRampToValueAtTime(200, start + 0.18);

    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 2.5;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  }
}

function playTurkeySound() {
  const t = audioCtx.currentTime;
  // Кулу-лу: gobbling with rapid frequency modulation
  const osc = audioCtx.createOscillator();
  const tremolo = audioCtx.createOscillator();
  const tremoloGain = audioCtx.createGain();
  const gain = audioCtx.createGain();
  const bp = audioCtx.createBiquadFilter();

  tremolo.frequency.value = 20;
  tremoloGain.gain.value = 60;
  tremolo.connect(tremoloGain);
  tremoloGain.connect(osc.frequency);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(400, t + 0.2);
  osc.frequency.linearRampToValueAtTime(350, t + 0.5);
  osc.frequency.linearRampToValueAtTime(280, t + 0.8);

  bp.type = 'bandpass';
  bp.frequency.value = 1000;
  bp.Q.value = 2;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.1, t + 0.03);
  gain.gain.setValueAtTime(0.1, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

  osc.connect(bp);
  bp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  tremolo.start(t);
  osc.stop(t + 1.0);
  tremolo.stop(t + 1.0);
}

function playBeeSound() {
  const t = audioCtx.currentTime;
  // Бзз: buzzing with two oscillators
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(150, t);
  osc1.frequency.linearRampToValueAtTime(180, t + 0.3);
  osc1.frequency.linearRampToValueAtTime(140, t + 0.8);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(153, t);
  osc2.frequency.linearRampToValueAtTime(183, t + 0.3);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
  gain.gain.setValueAtTime(0.06, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 1.0);
  osc2.stop(t + 1.0);
}

function playHorseSound() {
  const t = audioCtx.currentTime;
  // Іго-го: neighing with rising-falling frequency
  const osc = audioCtx.createOscillator();
  const vibrato = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  const gain = audioCtx.createGain();
  const lp = audioCtx.createBiquadFilter();

  vibrato.frequency.value = 6;
  vibratoGain.gain.value = 30;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(250, t);
  osc.frequency.linearRampToValueAtTime(500, t + 0.3);
  osc.frequency.linearRampToValueAtTime(600, t + 0.5);
  osc.frequency.linearRampToValueAtTime(400, t + 0.9);
  osc.frequency.linearRampToValueAtTime(250, t + 1.3);

  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1500, t);
  lp.frequency.linearRampToValueAtTime(2500, t + 0.4);
  lp.frequency.linearRampToValueAtTime(1000, t + 1.0);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
  gain.gain.setValueAtTime(0.12, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

  osc.connect(lp);
  lp.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + 1.5);
  vibrato.stop(t + 1.5);
}

function playGenericAnimalSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 400;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

const ANIMAL_SOUNDS: Record<string, () => void> = {
  chicken: playChickenSound,
  cow: playCowSound,
  pig: playPigSound,
  sheep: playSheepSound,
  duck: playDuckSound,
  rabbit: playRabbitSound,
  goat: playGoatSound,
  cat: playCatSound,
  dog: playDogSound,
  goose: playGooseSound,
  turkey: playTurkeySound,
  bee: playBeeSound,
  horse: playHorseSound,
};

export function playAnimalSound(animalId: string) {
  // Resume audio context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const fn = ANIMAL_SOUNDS[animalId] || playGenericAnimalSound;
  fn();
}

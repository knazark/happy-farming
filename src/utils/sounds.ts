// Web Audio API based animal sounds
const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playChickenSound() {
  // Clucking: short high-pitched bursts
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      playTone(800 + Math.random() * 200, 0.12, 'square', 0.08);
      playTone(1200 + Math.random() * 300, 0.08, 'sine', 0.06);
    }, i * 200);
  }
}

function playCowSound() {
  // Mooo: low frequency sweep
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.8);
  osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.5);
}

function playPigSound() {
  // Oink oink: nasal bursts
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playTone(250 + Math.random() * 60, 0.2, 'sawtooth', 0.08);
      setTimeout(() => playTone(300 + Math.random() * 50, 0.15, 'square', 0.06), 80);
    }, i * 350);
  }
}

function playSheepSound() {
  // Baa: medium frequency with vibrato
  const osc = audioCtx.createOscillator();
  const vibrato = audioCtx.createOscillator();
  const vibratoGain = audioCtx.createGain();
  const gain = audioCtx.createGain();

  vibrato.frequency.value = 8;
  vibratoGain.gain.value = 20;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(350, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.8);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  vibrato.start();
  osc.stop(audioCtx.currentTime + 1.0);
  vibrato.stop(audioCtx.currentTime + 1.0);
}

function playDuckSound() {
  // Quack quack
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playTone(500 + Math.random() * 100, 0.15, 'square', 0.07);
      setTimeout(() => playTone(400, 0.1, 'sawtooth', 0.05), 60);
    }, i * 250);
  }
}

function playRabbitSound() {
  // Soft squeaks
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      playTone(1500 + Math.random() * 500, 0.1, 'sine', 0.05);
    }, i * 300);
  }
}

function playGoatSound() {
  // Similar to sheep but higher and shorter
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(450, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(380, audioCtx.currentTime + 0.5);
  osc.frequency.linearRampToValueAtTime(420, audioCtx.currentTime + 0.7);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
}

function playCatSound() {
  // Meow: frequency sweep up then down
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.8);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.0);
}

function playDogSound() {
  // Bark: short sharp sounds
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      playTone(200, 0.08, 'sawtooth', 0.12);
      setTimeout(() => playTone(250, 0.15, 'square', 0.1), 50);
    }, i * 400);
  }
}

function playGenericAnimalSound() {
  playTone(400, 0.3, 'sine', 0.08);
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
};

export function playAnimalSound(animalId: string) {
  // Resume audio context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const fn = ANIMAL_SOUNDS[animalId] || playGenericAnimalSound;
  fn();
}

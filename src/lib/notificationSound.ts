let audioContextRef: AudioContext | null = null;
let hasUserInteracted = false;
let interactionListenersAttached = false;

function ensureInteractionTracking(): void {
  if (typeof window === 'undefined' || interactionListenersAttached) return;

  const markInteracted = () => {
    hasUserInteracted = true;
    window.removeEventListener('pointerdown', markInteracted);
    window.removeEventListener('keydown', markInteracted);
    interactionListenersAttached = false;
  };

  window.addEventListener('pointerdown', markInteracted, { once: true });
  window.addEventListener('keydown', markInteracted, { once: true });
  interactionListenersAttached = true;
}

let soundEnabled = true; // Default to true in-memory

export function isSoundNotificationEnabled(): boolean {
  return soundEnabled;
}

export function setSoundNotificationEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function playNotificationSound(): void {
  if (typeof window === 'undefined' || !isSoundNotificationEnabled()) return;
  ensureInteractionTracking();
  const audioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!audioContextClass) return;

  try {
    if (!audioContextRef) {
      audioContextRef = new audioContextClass();
    }
    const audioContext = audioContextRef;
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.26);
    if (hasUserInteracted && 'vibrate' in navigator) {
      navigator.vibrate?.(40);
    }
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

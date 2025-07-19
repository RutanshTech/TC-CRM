// Notification Sound Utility
class NotificationSound {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.5;
    this.init();
  }

  init() {
    try {
      // Create audio context for modern browsers
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported, falling back to simple audio');
    }
  }

  // Play a simple notification sound
  playNotificationSound() {
    if (!this.isEnabled) return;

    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      if (this.audioContext) {
        this.playTone();
      } else {
        this.playSimpleSound();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Play a tone using Web Audio API
  playTone() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a pleasant notification tone
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Fallback simple sound
  playSimpleSound() {
    const audio = new Audio();
    audio.volume = this.volume;
    
    // Create a simple beep sound using data URL
    const audioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    audio.src = audioData;
    audio.play().catch(error => {
      console.warn('Could not play audio:', error);
    });
  }

  // Enable/disable sound
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled.toString());
  }

  // Set volume
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('notificationSoundVolume', this.volume.toString());
  }

  // Load settings from localStorage
  loadSettings() {
    const enabled = localStorage.getItem('notificationSoundEnabled');
    const volume = localStorage.getItem('notificationSoundVolume');
    
    if (enabled !== null) {
      this.isEnabled = enabled === 'true';
    }
    
    if (volume !== null) {
      this.volume = parseFloat(volume);
    }
  }

  // Initialize settings
  initSettings() {
    this.loadSettings();
  }
}

// Create singleton instance
const notificationSound = new NotificationSound();
notificationSound.initSettings();

export default notificationSound; 
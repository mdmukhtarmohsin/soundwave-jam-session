class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  audioStreams: Map<string, { audio: HTMLAudioElement; gain: GainNode }> =
    new Map();
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      // Create audio context on first user interaction to comply with browser policies
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      }
    } catch (err) {
      console.error("Failed to initialize audio context:", err);
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.initAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      return Promise.resolve();
    } catch (error) {
      console.error("Error starting recording:", error);
      return Promise.reject(error);
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No recording in progress"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.audioChunks = [];

        // Stop all tracks on the media stream
        const tracks = this.mediaRecorder?.stream.getTracks() || [];
        tracks.forEach((track) => track.stop());

        this.mediaRecorder = null;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  addTrack(id: string, audioUrl: string, initialVolume: number = 75): void {
    this.initAudioContext();

    if (!this.audioContext || !this.masterGain) return;

    // Remove track if it already exists
    this.removeTrack(id);

    // Create audio element, set crossOrigin BEFORE src, and connect to audio context
    const audio = new Audio(); // Create element without source first
    audio.crossOrigin = "anonymous"; // Set crossOrigin property for Web Audio API CORS
    audio.src = audioUrl; // Now set the source URL
    audio.loop = false;
    audio.id = `audio-${id}`;

    const source = this.audioContext.createMediaElementSource(audio);
    const gainNode = this.audioContext.createGain();

    // Set initial volume
    gainNode.gain.value = initialVolume / 100;

    // Connect nodes: source -> gain -> master -> output
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    this.audioStreams.set(id, { audio, gain: gainNode });
  }

  playTrack(id: string): void {
    const track = this.audioStreams.get(id);
    if (track) {
      // --- Start Debug Logging ---
      console.log(`[AudioEngine] Attempting to play track: ${id}`);
      console.log(
        `[AudioEngine] AudioContext state: ${this.audioContext?.state}`
      );
      console.log(
        `[AudioEngine] Master Gain value: ${this.masterGain?.gain.value}`
      );
      console.log(`[AudioEngine] Track Gain value: ${track.gain.gain.value}`);
      console.log(
        `[AudioEngine] Audio Element Ready State: ${track.audio.readyState}`
      );
      console.log(
        `[AudioEngine] Audio Element Network State: ${track.audio.networkState}`
      );
      if (track.audio.error) {
        console.error(`[AudioEngine] Audio Element Error:`, track.audio.error);
      }
      // --- End Debug Logging ---

      // Resume context if suspended (required by browsers after user interaction)
      if (this.audioContext?.state === "suspended") {
        this.audioContext
          .resume()
          .then(() => {
            console.log("[AudioEngine] AudioContext resumed successfully.");
            track.audio.currentTime = 0;
            track.audio
              .play()
              .catch((err) =>
                console.error(
                  "[AudioEngine] Error playing track after resume:",
                  err
                )
              );
          })
          .catch((err) =>
            console.error("[AudioEngine] Error resuming AudioContext:", err)
          );
      } else {
        // Context is running or closed, attempt to play directly
        track.audio.currentTime = 0;
        track.audio
          .play()
          .catch((err) =>
            console.error("[AudioEngine] Error playing track:", err)
          );
      }
    }
  }

  pauseTrack(id: string): void {
    const track = this.audioStreams.get(id);
    if (track) {
      track.audio.pause();
    }
  }

  setTrackVolume(id: string, volume: number): void {
    const track = this.audioStreams.get(id);
    if (track && track.gain) {
      track.gain.gain.value = volume / 100;
    }
  }

  muteTrack(id: string, muted: boolean): void {
    const track = this.audioStreams.get(id);
    if (track && track.gain) {
      track.gain.gain.value = muted ? 0 : track.audio.volume;
    }
  }

  removeTrack(id: string): void {
    const track = this.audioStreams.get(id);
    if (track) {
      track.audio.pause();
      track.audio.src = "";
      this.audioStreams.delete(id);
    }
  }

  async createMixdown(): Promise<Blob> {
    // This is a simplified mock implementation
    // In a real app, you would use Web Audio API's OfflineAudioContext
    // to properly mix all audio tracks together

    // For now, just concatenate the audio files as a proof of concept
    const tracks = Array.from(this.audioStreams.values());
    if (tracks.length === 0) {
      return Promise.reject(new Error("No tracks to mix"));
    }

    // Mock mixdown - in reality you'd use OfflineAudioContext to mix properly
    return new Promise((resolve) => {
      // Return an empty audio blob as placeholder
      // In a real app, you would generate a real mixdown
      setTimeout(() => {
        const mockMixdownBlob = new Blob([new Uint8Array(1000)], {
          type: "audio/wav",
        });
        resolve(mockMixdownBlob);
      }, 2000);
    });
  }

  playAllTracks(): void {
    this.audioStreams.forEach((track) => {
      track.audio.currentTime = 0;
      track.audio
        .play()
        .catch((err) => console.error("Error playing track:", err));
    });
  }

  pauseAllTracks(): void {
    this.audioStreams.forEach((track) => {
      track.audio.pause();
    });
  }

  cleanUp(): void {
    this.pauseAllTracks();
    this.audioStreams.forEach((track, id) => {
      this.removeTrack(id);
    });
    this.audioStreams.clear();
  }
}

export const audioEngine = new AudioEngine();

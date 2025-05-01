class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  audioStreams: Map<string, { audio: HTMLAudioElement; gain: GainNode }> =
    new Map();
  private masterGain: GainNode | null = null;

  // --- Event Emitter Setup ---
  private listeners: {
    [key: string]: Array<(data?: any) => void>;
  } = {};

  on(event: string, callback: (data?: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback
    );
  }

  private emit(event: string, data?: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((listener) => listener(data));
  }
  // --- End Event Emitter Setup ---

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

    // --- Listen for events internally ---
    const onDurationChange = () => {
      const duration = audio.duration;
      // Only emit metadata once we have a finite duration
      if (duration && isFinite(duration)) {
        console.log(`[AudioEngine] Duration determined for ${id}: ${duration}`);
        this.emit("metadata", { id, duration });
        // Optional: Remove listener once duration is known to prevent multiple emits
        audio.removeEventListener("durationchange", onDurationChange);
      }
    };
    // Remove the 'loadedmetadata' listener
    // audio.addEventListener('loadedmetadata', () => { ... });
    audio.addEventListener("durationchange", onDurationChange);

    audio.addEventListener("ended", () => {
      this.emit("pause", id);
    });
    // --- End event listeners ---

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
              .then(() => {
                this.emit("play", id); // Emit play event
              })
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
          .then(() => {
            this.emit("play", id); // Emit play event
          })
          .catch((err) =>
            console.error("[AudioEngine] Error playing track:", err)
          );
      }
    } else {
      console.warn(`[AudioEngine] Track not found for play: ${id}`);
    }
  }

  pauseTrack(id: string): void {
    const track = this.audioStreams.get(id);
    if (track) {
      track.audio.pause();
      this.emit("pause", id); // Emit pause event
    } else {
      console.warn(`[AudioEngine] Track not found for pause: ${id}`);
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
      // Disconnect nodes to release resources
      const source = this.audioContext?.createMediaElementSource(track.audio); // Need to recreate source to disconnect? Maybe store it?
      source?.disconnect(); // Disconnect from gain
      track.gain.disconnect(); // Disconnect from masterGain
      track.audio.src = ""; // Release the audio file reference
      this.audioStreams.delete(id);
      console.log(`[AudioEngine] Track ${id} removed and cleaned up.`);
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
    // Ensure context is running before attempting to play all
    if (this.audioContext?.state === "suspended") {
      this.audioContext
        .resume()
        .catch((err) =>
          console.error(
            "[AudioEngine] Error resuming context for playAll:",
            err
          )
        );
      // Note: We might ideally wait for resume(), but for playAll,
      // attempting to play immediately after resume is often sufficient.
    }

    this.audioStreams.forEach((track, trackId) => {
      // Individual play attempts might still need resume if the first one didn't take immediately
      if (this.audioContext?.state === "suspended") {
        this.audioContext
          .resume()
          .catch((err) =>
            console.error(
              "[AudioEngine] Error resuming context in playAll loop:",
              err
            )
          );
      }
      track.audio.currentTime = 0;
      track.audio
        .play()
        .then(() => {
          this.emit("play", trackId);
        })
        .catch((err) =>
          console.error("[AudioEngine] Error playing track in playAll:", err)
        );
    });
  }

  pauseAllTracks(): void {
    this.audioStreams.forEach((track, trackId) => {
      track.audio.pause();
      this.emit("pause", trackId); // Emit pause event for each track
    });
  }

  cleanUp(): void {
    this.pauseAllTracks();
    this.audioStreams.forEach((track, id) => {
      this.removeTrack(id);
    });
    this.audioStreams.clear();
  }

  // --- Add setTrackLooping method ---
  setTrackLooping(id: string, shouldLoop: boolean): void {
    const track = this.audioStreams.get(id);
    if (track) {
      track.audio.loop = shouldLoop;
      console.log(`[AudioEngine] Track ${id} loop set to: ${shouldLoop}`);
    } else {
      console.warn(`[AudioEngine] Track not found for setting loop: ${id}`);
    }
  }
  // --- End setTrackLooping method ---

  // --- New Export Functionality ---

  async mixAndExportTracks(): Promise<{ blob: Blob; url: string } | null> {
    if (!this.audioContext) {
      console.error("AudioContext not initialized.");
      alert("Audio engine not ready. Please interact with the page first.");
      this.emit("export_error", "AudioContext not initialized");
      return null;
    }
    if (this.audioStreams.size === 0) {
      console.warn("No tracks to export.");
      alert("There are no tracks to export.");
      this.emit("export_error", "No tracks to export");
      return null;
    }

    console.log("Starting mixdown export...");
    this.emit("export_start");

    try {
      const trackDataPromises = Array.from(this.audioStreams.entries()).map(
        async ([id, { audio, gain }]) => {
          if (!audio.src) {
            console.warn(`Track ${id} has no source URL, skipping.`);
            return null;
          }
          try {
            const response = await fetch(audio.src);
            if (!response.ok)
              throw new Error(
                `Failed to fetch ${audio.src}: ${response.statusText}`
              );
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.audioContext.decodeAudioData(
              arrayBuffer
            );
            return { buffer: decodedBuffer, gainValue: gain.gain.value, id };
          } catch (error) {
            console.error(
              `Error processing track ${id} (${audio.src}):`,
              error
            );
            return null;
          }
        }
      );
      const trackDataArray = (await Promise.all(trackDataPromises)).filter(
        (data) => data !== null
      ) as { buffer: AudioBuffer; gainValue: number; id: string }[];

      if (trackDataArray.length === 0) {
        console.warn("No valid tracks could be processed for export.");
        alert("No tracks could be processed for the export.");
        this.emit("export_error", "No processable tracks");
        return null;
      }

      const maxLength = Math.max(
        ...trackDataArray.map((data) => data.buffer.duration)
      );
      const sampleRate = this.audioContext.sampleRate;
      const numberOfChannels = Math.max(
        ...trackDataArray.map((data) => data.buffer.numberOfChannels)
      );

      console.log(
        `Creating OfflineAudioContext: Length=${maxLength}s, SampleRate=${sampleRate}Hz, Channels=${numberOfChannels}`
      );
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        Math.ceil(maxLength * sampleRate),
        sampleRate
      );

      trackDataArray.forEach(({ buffer, gainValue, id }) => {
        console.log(
          `Adding track ${id} to mixdown (Gain: ${gainValue.toFixed(2)})`
        );
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = gainValue;
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        source.start(0);
      });

      console.log("Rendering offline context...");
      const renderedBuffer = await offlineContext.startRendering();
      console.log("Offline rendering complete.");

      const wavBlob = this.audioBufferToWav(renderedBuffer);

      const url = URL.createObjectURL(wavBlob);
      console.log("Export successful, WAV Blob created.");

      this.emit("export_complete", { blob: wavBlob, url: url });

      return { blob: wavBlob, url: url };
    } catch (error) {
      console.error("Error during mixdown export:", error);
      alert(
        `An error occurred during export: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.emit("export_error", error);
      return null;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const L = buffer.length * numOfChan * 2 + 44; // 2 bytes per sample
    const bufferArr = new ArrayBuffer(L);
    const view = new DataView(bufferArr);
    const channels: Float32Array[] = [];
    let sample: number;
    let offset = 0;
    let pos = 0;

    // Write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(L - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this implementation)

    setUint32(0x61746164); // "data" - chunk
    setUint32(L - pos); // chunk length

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < L) {
      for (let i = 0; i < numOfChan; i++) {
        // Interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Convert to 16-bit signed int
        view.setInt16(pos, sample, true); // Write 16-bit sample
        pos += 2;
      }
      offset++; // Next frame
    }

    return new Blob([view], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }

  // --- End Export Functionality ---
}

export const audioEngine = new AudioEngine();

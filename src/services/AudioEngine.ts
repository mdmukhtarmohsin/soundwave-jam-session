class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  audioStreams: Map<
    string,
    {
      audio: HTMLAudioElement;
      gain: GainNode;
      source: MediaElementAudioSourceNode;
    }
  > = new Map();
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

    this.removeTrack(id);

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = audioUrl;
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
    audio.addEventListener("durationchange", onDurationChange);

    // --- Ensure ended listener calls check function ---
    const onEnded = () => {
      console.log(`[AudioEngine] Track ${id} ended.`);
      this.emit("pause", id); // Emit pause for individual track state
      this._checkAllPausedAfterEnded(); // Check if all tracks are now paused
    };
    audio.addEventListener("ended", onEnded);
    // --- End event listeners ---

    // Create and connect nodes
    const source = this.audioContext.createMediaElementSource(audio);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = initialVolume / 100;
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    this.audioStreams.set(id, { audio, gain: gainNode, source });
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
    const trackData = this.audioStreams.get(id);
    if (trackData) {
      trackData.audio.pause();
      // Disconnect nodes properly: source -> gain -> master
      try {
        trackData.source.disconnect(); // Disconnect source node
      } catch (e) {
        console.warn(
          `[AudioEngine] Error disconnecting source node for track ${id}:`,
          e
        );
      }
      try {
        trackData.gain.disconnect(); // Disconnect gain node
      } catch (e) {
        console.warn(
          `[AudioEngine] Error disconnecting gain node for track ${id}:`,
          e
        );
      }

      trackData.audio.src = ""; // Release the audio file reference
      trackData.audio.removeAttribute("src"); // More reliable cleanup
      trackData.audio.load(); // Reset element state

      this.audioStreams.delete(id);
      console.log(`[AudioEngine] Track ${id} removed and cleaned up.`);
    }
  }

  async createMixdown(): Promise<Blob> {
    // This is a simplified mock implementation
    // In a real app, you would use Web Audio API's OfflineAudioContext
    // to properly mix all audio tracks together

    // For now, just concatenate the audio files as a proof of concept
    // This part needs significant improvement for a real application
    console.warn("[AudioEngine] createMixdown is using a mock implementation.");
    return new Blob([]); // Return empty blob for now
  }

  playAllTracks(): void {
    console.log("[AudioEngine] Playing all tracks.");
    // Resume context if suspended
    if (this.audioContext?.state === "suspended") {
      this.audioContext
        .resume()
        .then(() => {
          console.log("[AudioEngine] AudioContext resumed for playAllTracks.");
          this.audioStreams.forEach((trackData, id) => {
            console.log(`[AudioEngine] Resetting and playing track ${id}`);
            trackData.audio.currentTime = 0;
            trackData.audio
              .play()
              .then(() => {
                this.emit("play", id); // Emit play event for this track
              })
              .catch((err) => console.error(`Error playing track ${id}:`, err));
          });
        })
        .catch((err) =>
          console.error("Error resuming context for playAllTracks:", err)
        );
    } else {
      this.audioStreams.forEach((trackData, id) => {
        console.log(`[AudioEngine] Resetting and playing track ${id}`);
        trackData.audio.currentTime = 0;
        trackData.audio
          .play()
          .then(() => {
            this.emit("play", id); // Emit play event for this track
          })
          .catch((err) => console.error(`Error playing track ${id}:`, err));
      });
    }
    // Remove general 'play_all' event if not needed elsewhere
    // this.emit('play_all');
  }

  pauseAllTracks(): void {
    console.log("[AudioEngine] Pausing all tracks.");
    this.audioStreams.forEach((trackData, id) => {
      trackData.audio.pause();
      this.emit("pause", id); // Emit pause event for this track
    });
    // Remove general 'pause_all' event if not needed elsewhere
    // this.emit('pause_all');
  }

  cleanUp(): void {
    console.log("[AudioEngine] Cleaning up all tracks and context.");
    this.audioStreams.forEach((trackData, id) => {
      trackData.audio.pause();
      try {
        trackData.source.disconnect();
      } catch (e) {}
      try {
        trackData.gain.disconnect();
      } catch (e) {}
      trackData.audio.src = "";
      trackData.audio.removeAttribute("src");
      trackData.audio.load();
    });
    this.audioStreams.clear();
    // Don't close the audio context here, as it might be needed again.
    // Browsers handle context cleanup eventually.
    // this.audioContext?.close().catch(e => console.warn("Error closing audio context:", e));
    // this.audioContext = null;
    console.log("[AudioEngine] Cleanup complete.");
  }

  setTrackLooping(id: string, shouldLoop: boolean): void {
    const trackData = this.audioStreams.get(id);
    if (trackData) {
      console.log(
        `[AudioEngine] Setting looping for track ${id} to ${shouldLoop}`
      );
      trackData.audio.loop = shouldLoop;
    } else {
      console.warn(`[AudioEngine] Track not found for setting loop: ${id}`);
    }
  }

  // --- Advanced Mixdown Logic (OfflineAudioContext) ---
  async mixAndExportTracks(): Promise<{ blob: Blob; url: string } | null> {
    this.initAudioContext();
    if (!this.audioContext || this.audioStreams.size === 0) {
      console.warn(
        "[AudioEngine] Cannot mix: No audio context or no tracks loaded."
      );
      this.emit("export_error", new Error("No tracks to mix."));
      return null;
    }

    console.log("[AudioEngine] Starting mixdown process...");
    this.emit("export_start");

    let maxDuration = 0;
    const validTracksToMix = new Map<
      string,
      {
        audio: HTMLAudioElement;
        gain: GainNode;
        source: MediaElementAudioSourceNode;
      }
    >();

    // Determine the maximum duration and gather valid sources WITH gain info
    this.audioStreams.forEach((trackData, id) => {
      // --- Updated Check ---
      const duration = trackData.audio.duration;
      const readyState = trackData.audio.readyState;

      // Check if metadata (duration) is loaded AND duration is valid finite number
      if (readyState >= 1 && duration && isFinite(duration)) {
        maxDuration = Math.max(maxDuration, duration);
        validTracksToMix.set(id, trackData); // Store the whole trackData object
      } else {
        console.warn(
          `[AudioEngine] Track ${id} skipped in mixdown (readyState: ${readyState}, duration: ${duration})`
        );
      }
      // --- End Updated Check ---
    });

    if (validTracksToMix.size === 0) {
      console.error(
        "[AudioEngine] No valid tracks found to mix (likely not loaded)."
      );
      // Emit a more user-friendly error message
      this.emit(
        "export_error",
        new Error("Please play tracks once before exporting.")
      );
      return null;
    }
    if (maxDuration === 0) {
      console.error("[AudioEngine] Max duration is 0, cannot create mix.");
      // Keep this error more technical, as it's a different issue
      this.emit("export_error", new Error("Cannot determine mix duration."));
      return null;
    }

    console.log(
      `[AudioEngine] Determined max duration: ${maxDuration} seconds. Mixing ${validTracksToMix.size} tracks.`
    );

    try {
      // Use OfflineAudioContext for high-quality mixing
      const offlineCtx = new OfflineAudioContext(
        2, // Stereo
        this.audioContext.sampleRate * maxDuration,
        this.audioContext.sampleRate
      );

      // Process each valid track
      const promises = Array.from(validTracksToMix.entries()).map(
        async ([id, trackData]) => {
          try {
            const response = await fetch(trackData.audio.src);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch ${trackData.audio.src}: ${response.statusText}`
              );
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

            // Create nodes within the OfflineAudioContext
            const bufferSource = offlineCtx.createBufferSource();
            bufferSource.buffer = audioBuffer;

            // --- Apply Gain ---
            const offlineGainNode = offlineCtx.createGain();
            offlineGainNode.gain.value = trackData.gain.gain.value; // Apply current gain value
            console.log(
              `[AudioEngine Mix] Applying gain ${offlineGainNode.gain.value.toFixed(
                2
              )} to track ${id}`
            );

            // Connect nodes: bufferSource -> offlineGainNode -> destination
            bufferSource.connect(offlineGainNode);
            offlineGainNode.connect(offlineCtx.destination);
            // --- End Gain ---

            bufferSource.start(0); // Start track at time 0
          } catch (processError) {
            console.error(
              `[AudioEngine] Error processing track ${id} (${trackData.audio.src}) for mixdown:`,
              processError
            );
            throw new Error(`Failed to process track: ${id}`);
          }
        }
      );

      await Promise.all(promises);
      console.log("[AudioEngine] All tracks decoded and scheduled for mixing.");

      const renderedBuffer = await offlineCtx.startRendering();
      console.log("[AudioEngine] Offline rendering complete.");

      const wavBlob = this.audioBufferToWav(renderedBuffer);
      const objectUrl = URL.createObjectURL(wavBlob);

      console.log(
        `[AudioEngine] Mixdown complete. WAV Blob size: ${wavBlob.size}, URL: ${objectUrl}`
      );
      this.emit("export_complete", { blob: wavBlob, url: objectUrl });
      return { blob: wavBlob, url: objectUrl };
    } catch (error) {
      console.error("[AudioEngine] Error during offline mixdown:", error);
      this.emit("export_error", error);
      return null;
    }
  }

  // Helper to convert AudioBuffer to WAV Blob
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    // Slightly modified from https://russellgood.com/how-to-convert-audiobuffer-to-audio-file/
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44; // 2 bytes per sample
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // Write WAV container
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([bufferArr], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }

  // --- Ensure private check method exists and emits event ---
  private _checkAllPausedAfterEnded(): void {
    setTimeout(() => {
      if (this.audioStreams.size === 0) return;
      let allPaused = true;
      for (const trackData of this.audioStreams.values()) {
        if (!trackData.audio || !trackData.audio.paused) {
          allPaused = false;
          break;
        }
      }
      if (allPaused) {
        console.log(
          "[AudioEngine] All tracks confirmed paused after ended event(s). Emitting all_tracks_ended."
        );
        this.emit("all_tracks_ended");
      }
    }, 0);
  }
  // --- End private method ---
}

export const audioEngine = new AudioEngine();

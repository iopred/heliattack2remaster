class AudioManager {
    constructor() {
        this.audioCache = new Map(); // Stores preloaded audio buffers
        this.context = null; // Audio context (created in init)
        this.gainNodes = new Map(); // Manages gain (volume) for different audio
        this.toPreload = [];
        this.preloadPromise = null; // Stores the promise for the preload process
        this.masterVolume = 1.0;
        this.looping = null;
    }

    /**
     * Initializes the audio context. This must be called after user input.
     */
    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized.');

            if (this.toPreload.length > 0) {
                this._executePreload(); // Preload any queued audio files
            }
        }
    }

        /**
     * Internal method to execute the preload process.
     * Resolves the preload promise once all files are loaded.
     */
    _executePreload() {
            const preloadFiles = [...this.toPreload];
            this.toPreload = [];
    
            const promises = preloadFiles.map(({ key, url }) =>
                fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(data => this.context.decodeAudioData(data))
                    .then(buffer => {
                        this.audioCache.set(key, buffer);
                    })
                    .catch(error => {
                        console.warn(`Could not load sound: ${key} - ${error}`);
                    })
            );
    
            // Ensure the preload promise resolves when all are loaded
            Promise.all(promises)
                .then(() => {
                    if (this.preloadPromise) {
                        this.preloadPromise.resolve();
                        this.preloadPromise = null;
                    }
                })
                .catch(error => {
                    if (this.preloadPromise) {
                        this.preloadPromise.reject(error);
                        this.preloadPromise = null;
                    }
                });
        }

    /**
     * Preloads an array of audio files.
     * @param {Array} audioFiles - An array of objects: { key: string, url: string }
     * @returns {Promise} - Resolves when all files are loaded.
     */
    preload(audioFiles) {
        // If the context hasn't been initialized, queue the files and return a promise
        if (!this.context) {
            this.toPreload.push(...audioFiles);

            // Create a new promise if none exists
            if (!this.preloadPromise) {
                this.preloadPromise = {};
                this.preloadPromise.promise = new Promise((resolve, reject) => {
                    this.preloadPromise.resolve = resolve;
                    this.preloadPromise.reject = reject;
                });
            }

            return this.preloadPromise.promise;
        }

        // If the context is initialized, load the files immediately
        const promises = audioFiles.map(({ key, url }) =>
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => this.context.decodeAudioData(data))
                .then(buffer => {
                    this.audioCache.set(key, buffer);
                })
                .catch(error => {
                    console.warn(`Could not load sound: ${key} - ${error}`);
                })
        );

        return Promise.all(promises);
    }

    /**
     * Plays a sound effect.
     * @param {string} key - The key of the audio file to play.
     * @param {number} [volume=1.0] - Volume (0.0 to 1.0).
     */
    playEffect(key, volume = 1.0) {
        if (!this.audioCache.has(key)) {
            return;
        }

        const buffer = this.audioCache.get(key);
        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume * this.masterVolume;

        source.connect(gainNode).connect(this.context.destination);
        source.start();
    }

    /**
     * Crossfades to a new looping audio track.
     * @param {string} currentKey - The key of the current audio file (to fade out).
     * @param {string} newKey - The key of the new audio file (to fade in and retain position).
     * @param {number} [volume=1.0] - Volume for the new track (0.0 to 1.0).
     * @param {number} [fadeDuration=1.0] - Duration of the crossfade in seconds.
     */
    crossFadeLoop(currentKey, newKey, volume = 1.0, fadeDuration = 1.0) {
        if (!this.looping) {
            this.playLoop(newKey, volume);
        }
        if (!this.audioCache.has(newKey)) {
            console.warn(`Audio key "${newKey}" not found in cache.`);
            return;
        }

        const now = this.context.currentTime;

        // Fade out the current track
        if (this.gainNodes.has(currentKey)) {
            const { source: currentSource, gainNode: currentGain } = this.gainNodes.get(currentKey);
            currentGain.gain.setValueAtTime(currentGain.gain.value, now);
            currentGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

            // Stop the old source after fading out
            currentSource.stop(now + fadeDuration);

            this.gainNodes.delete(currentKey);
        }

        // Start the new track, aligned with its playback position
        const newBuffer = this.audioCache.get(newKey);
        const newSource = this.context.createBufferSource();
        newSource.buffer = newBuffer;
        newSource.loop = true;

        const newGain = this.context.createGain();
        newGain.gain.value = 0; // Start at 0 for fade-in
        newGain.gain.setValueAtTime(0, now);
        newGain.gain.linearRampToValueAtTime(volume * this.masterVolume, now + fadeDuration);

        // Align playback position of new loop
        const newPosition = now % newBuffer.duration; // Calculate playback position
        newSource.start(now, newPosition);

        // Connect the new source
        newSource.connect(newGain).connect(this.context.destination);

        // Save the new source and gainNode
        this.gainNodes.set(newKey, { source: newSource, gainNode: newGain });
    }

    /**
     * Starts looping audio (e.g., background music).
     * @param {string?} key - The key of the audio file to play.
     * @param {number} [volume=1.0] - Volume (0.0 to 1.0).
     */
    playLoop(key, volume = 1.0) {
        if (!key) {
            return;
        }
        if (this.looping) {
            this.stopLoop(this.looping);
        }
        this.looping = key
        if (!this.audioCache.has(key)) {
            return;
        }

        if (this.gainNodes.has(key)) {
            return;
        }

        const buffer = this.audioCache.get(key);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume * this.masterVolume;

        source.connect(gainNode).connect(this.context.destination);
        source.start();

        this.gainNodes.set(key, { source, gainNode });
    }

    /**
     * Stops a looping audio track.
     * @param {string} key - The key of the looping audio to stop.
     */
    stopLoop(key) {
        if (!key && this.looping) {
            this.stopLoop(this.looping);
        }
        if (!this.gainNodes.has(key)) {
            return;
        }

        const { source } = this.gainNodes.get(key);
        source.stop();
        this.gainNodes.delete(key);
    }

    /**
     * Sets the volume for a looping audio track.
     * @param {string} key - The key of the audio file.
     * @param {number} volume - Volume (0.0 to 1.0).
     */
    setLoopVolume(key, volume) {
        if (!key && this.looping) {
            return this.setLoopVolume(this.looping, volume);
        }
        if (!this.gainNodes.has(key)) {
            return;
        }

        const { gainNode } = this.gainNodes.get(key);
        gainNode.gain.value = volume * this.masterVolume;
    }
}

export default AudioManager;
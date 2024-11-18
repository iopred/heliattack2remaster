class AudioManager {
    constructor() {
        this.audioCache = new Map(); // Stores preloaded audio buffers
        this.context = null; // Audio context (created in init)
        this.gainNodes = new Map(); // Manages gain (volume) for different audio
        this.toPreload = [];
    }

    /**
     * Initializes the audio context. This must be called after user input.
     */
    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized.');
            if (this.toPreload) {
                this.preload(this.toPreload);
            }
        }
    }

    /**
     * Preloads an array of audio files.
     * @param {Array} audioFiles - An array of objects: { key: string, url: string }
     * @returns {Promise} - Resolves when all files are loaded.
     */
    preload(audioFiles) {
        if (!this.context) {
            this.toPreload.push(...audioFiles);
            return;
        }
        const promises = audioFiles.map(({ key, url }) => 
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => this.context.decodeAudioData(data))
                .then(buffer => {
                    this.audioCache.set(key, buffer);
                })
                .catch(error => {
                    console.log(`Could not load sound: ${key} ${error}`);
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
            console.error(`Audio key "${key}" not found in cache.`);
            return;
        }

        const buffer = this.audioCache.get(key);
        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode).connect(this.context.destination);
        source.start();
    }

    /**
     * Starts looping audio (e.g., background music).
     * @param {string} key - The key of the audio file to play.
     * @param {number} [volume=1.0] - Volume (0.0 to 1.0).
     */
    playLoop(key, volume = 1.0) {
        if (!this.audioCache.has(key)) {
            console.error(`Audio key "${key}" not found in cache.`);
            return;
        }

        if (this.gainNodes.has(key)) {
            console.warn(`Audio key "${key}" is already looping.`);
            return;
        }

        const buffer = this.audioCache.get(key);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode).connect(this.context.destination);
        source.start();

        this.gainNodes.set(key, { source, gainNode });
    }

    /**
     * Stops a looping audio track.
     * @param {string} key - The key of the looping audio to stop.
     */
    stopLoop(key) {
        if (!this.gainNodes.has(key)) {
            console.error(`Audio key "${key}" is not currently looping.`);
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
        if (!this.gainNodes.has(key)) {
            console.error(`Audio key "${key}" is not currently looping.`);
            return;
        }

        const { gainNode } = this.gainNodes.get(key);
        gainNode.gain.value = volume;
    }
}

export default AudioManager;
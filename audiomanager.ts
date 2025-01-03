type AudioFile = { key: string; url: string };
type AudioNodeInfo = { source: AudioBufferSourceNode; gainNode: GainNode };

class AudioManager {
    private audioCache: Map<string, AudioBuffer>;
    private context: AudioContext | null;
    private gainNodes: Map<string, AudioNodeInfo>;
    private toPreload: AudioFile[];
    private preloadPromise: { promise: Promise<void>; resolve: () => void; reject: (error: any) => void } | null;
    public masterVolume: number;
    private musicVolume_: number;
    private effectVolume_: number;
    private looping: string | null;
    private playingEffects: AudioNodeInfo[];
    private preloading: Promise<any> | null;
    private startTime: number | null = null; // Tracks when the current track started
    private timeScale_: number = 1.0;
    private loopingVolume_: number;
    private lastContextTime_: number;
    private currentTime_: number;

    constructor() {
        this.audioCache = new Map();
        this.context = null;
        this.gainNodes = new Map();
        this.toPreload = [];
        this.preloadPromise = null;
        this.masterVolume = 1.0;
        this.musicVolume_ = 1.0;
        this.effectVolume_ = 1.0;
        this.looping = null;
        this.loopingVolume_ = 1.0;
        this.playingEffects = [];
        this.preloading = null;
        this.lastContextTime_ = 0;
    }

    init(): void {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.warn('AudioContext initialized.');

            if (this.toPreload.length > 0) {
                this._executePreload();
            }
        }
    }

    private _executePreload(): void {
        const preloadFiles = [...this.toPreload];
        this.toPreload = [];

        const promises = preloadFiles.map(({ key, url }) =>
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => this.context!.decodeAudioData(data))
                .then(buffer => {
                    this.audioCache.set(key, buffer);
                })
                .catch(error => {
                    console.warn(`Could not load sound: ${key} - ${error}`);
                })
        );

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

    preload(audioFiles: AudioFile[]): Promise<void> {
        if (!this.context) {
            this.toPreload.push(...audioFiles);

            if (!this.preloadPromise) {
                let resolve: () => void;
                let reject: (error: any) => void;
                const promise = new Promise<void>((res, rej) => {
                    resolve = res;
                    reject = rej;
                });
                this.preloadPromise = { promise, resolve: resolve!, reject: reject! };
            }

            return this.preloadPromise.promise;
        }

        const promises = audioFiles.map(({ key, url }) =>
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => this.context!.decodeAudioData(data))
                .then(buffer => {
                    this.audioCache.set(key, buffer);
                })
                .catch(error => {
                    console.warn(`Could not load sound: ${key} - ${error}`);
                })
        );

        this.preloading = this.preloading
            ? this.preloading.then(() => Promise.all(promises))
            : Promise.all(promises);

        return this.preloading;
    }

    playEffect(key: string, volume = 1.0): { source: AudioBufferSourceNode; gainNode: GainNode } | null {
        if (!this.audioCache.has(key) || !this.context) {
            return null;
        }

        const buffer = this.audioCache.get(key)!;
        const source = this.context!.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.context!.createGain();
        gainNode.gain.value = volume * this.masterVolume * this.effectVolume_;

        const effectObject = { source, gainNode };

        source.connect(gainNode).connect(this.context!.destination);
        source.start();
        source.onended = () => {
            const index = this.playingEffects.indexOf(effectObject);
            if (index !== -1) {
                this.playingEffects.splice(index, 1);
            }
        }
        source.playbackRate.value = this.timeScale_;

        this.playingEffects.push(effectObject);

        return effectObject;
    }

    set currentTime(value: number) {
        if (!this.looping || !this.context || !this.gainNodes.has(this.looping)) {
            return;
        }
    
        const { source, gainNode } = this.gainNodes.get(this.looping)!;
    
        // Stop the current source if needed
        source.stop();
    
        // Restart the source with the new playback offset
        const buffer = source.buffer;
        if (!buffer) {
            console.warn("No buffer found for the current source.");
            return;
        }
    
        const seekTime = value % buffer.duration; // Ensure the time stays within the buffer duration
        const newSource = this.context.createBufferSource();
        newSource.buffer = buffer;
        newSource.loop = true;
        newSource.playbackRate.value = this.timeScale_;


        // Reconnect to the same gain node
        newSource.connect(gainNode);
    
        // Start playback from the specified offset
        newSource.start(0, seekTime);

        this.currentTime_ = value;
    
        // Update the gain node mapping
        this.gainNodes.set(this.looping, { source: newSource, gainNode });
    }

    get currentTime(): number {
        if (!this.looping || !this.context || !this.gainNodes.has(this.looping)) {
            return 0;
        }
    
        const { source } = this.gainNodes.get(this.looping)!;
    
        const contextCurrentTime = this.context.currentTime;

        // Calculate elapsed time relative to when the track started, accounting for playback rate
        const elapsedTime = (contextCurrentTime - this.lastContextTime_) * this.timeScale_;

        this.lastContextTime_ = contextCurrentTime;
        // Ensure elapsedTime is wrapped within the duration of the buffer
        const duration = source.buffer?.duration || Infinity;

        this.currentTime_ = (this.currentTime_ + elapsedTime) % duration;
        
        return this.currentTime_;
    }

    get musicVolume(): number {
        return this.musicVolume_;
    }

    set musicVolume(value: number) {
        this.musicVolume_ = value;
        if (this.looping && this.gainNodes.has(this.looping)) {
            const { gainNode } = this.gainNodes.get(this.looping)!;
            gainNode.gain.value = value * this.masterVolume * this.musicVolume_;
        }
    }

    get effectVolume(): number {
        return this.effectVolume_;
    }

    set effectVolume(value: number) {
        this.effectVolume_ = value;

        let loopingGainNode
        if (this.looping && this.gainNodes.has(this.looping)) {
            const { gainNode } = this.gainNodes.get(this.looping)!;
            loopingGainNode = gainNode;
        }

        let i = this.playingEffects.length - 1;
        for (; i >= 0; i--) {
            let { source, gainNode } = this.playingEffects[i];
            if (gainNode == loopingGainNode) {
                return;
            }
            gainNode.gain.value = value * this.masterVolume * this.effectVolume_;
        }
    }

    get totalTime(): number {
        if (!this.looping || !this.gainNodes.has(this.looping)) {
            return 1.0;
        }

        const { source } = this.gainNodes.get(this.looping)!;
        return source.buffer?.duration || 0;
    }

    get timeScale() {
        return this.timeScale_;
    }

    set timeScale(value) {
        this.timeScale_ = Math.min(1, Math.max(0.5, value));

        for (let [key, object] of this.gainNodes) {
            let source = object.source;
            let gainNode = object.gainNode;
            source.playbackRate.value = this.timeScale_;
        }
        let i = this.playingEffects.length - 1;
        for (; i >= 0; i--) {
            let { source, gainNode } = this.playingEffects[i];
            source.playbackRate.value = this.timeScale_;
        }
        if (i >= 0) {
            this.playingEffects.splice(0, i);
        }

    }

    playMusic(key: string, volume = 1.0, startTime = 0.0): void {
        if (this.looping) {
            this.stopLoop(this.looping);
        }

        this.looping = key;
        this.loopingVolume_ = volume;
        this.playLoop(key, volume, startTime, true);
    }

    playLoop(key: string, volume = 1.0, startTime = 0.0, useMusicVolume = true): void {
        if (!key || !this.context || !this.audioCache.has(key)) {
            console.warn(`Cannot play loop: invalid key or uninitialized context.`);
            return;
        }
    
        if (this.gainNodes.has(key)) {
            console.warn(`Audio key "${key}" is already playing.`);
            return;
        }
    
        const buffer = this.audioCache.get(key)!;
        const source = this.context!.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = this.timeScale_; // Set the playback rate
    
        const gainNode = this.context!.createGain();
        gainNode.gain.value = volume * this.masterVolume * (useMusicVolume ? this.musicVolume_ : this.effectVolume_);
    
        source.connect(gainNode).connect(this.context!.destination);
        source.start(0, startTime);
    
        this.gainNodes.set(key, { source, gainNode });
    
        if (useMusicVolume) {  
            this.lastContextTime_ = this.context?.currentTime;
            this.currentTime_ = startTime; 
        }
    }

    stopLoop(key?: string): void {
        const targetKey = key || this.looping;
        if (targetKey === this.looping) {
            this.looping = null;
        }

        if (!targetKey || !this.gainNodes.has(targetKey)) {
            console.warn(`No loop is currently playing for key: ${key}`);
            return;
        }

        const { source } = this.gainNodes.get(targetKey)!;
        source.stop();
        this.gainNodes.delete(targetKey);

        if (targetKey === this.looping) {
            this.looping = null;
        }
    }

    crossFadeMusic(newKey: string, volume = 1.0, fadeDuration = 1.0): void {
        if (!this.context) {
            console.warn(`AudioContext is not initialized.`);
            return;
        }

        if (!this.audioCache.has(newKey)) {
            console.warn(`Audio key "${newKey}" not found in cache.`);
            return;
        }

        const now = this.context!.currentTime;

        // Fade out the current track
        if (this.looping && this.gainNodes.has(this.looping)) {
            const { source: currentSource, gainNode: currentGain } = this.gainNodes.get(this.looping)!;
            currentGain.gain.setValueAtTime(currentGain.gain.value, now);
            currentGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

            currentSource.stop(now + fadeDuration);
            this.gainNodes.delete(this.looping);
        }

        // Start the new track
        const newBuffer = this.audioCache.get(newKey)!;
        const newSource = this.context!.createBufferSource();
        newSource.buffer = newBuffer;
        newSource.loop = true;

        const newGain = this.context!.createGain();
        newGain.gain.value = 0; // Start at 0 for fade-in
        newGain.gain.setValueAtTime(0, now);
        newGain.gain.linearRampToValueAtTime(volume * this.masterVolume * this.musicVolume, now + fadeDuration);

        newSource.connect(newGain).connect(this.context!.destination);
        newSource.start(0, this.currentTime);

        this.gainNodes.set(newKey, { source: newSource, gainNode: newGain });
        this.looping = newKey;
        this.loopingVolume_ = volume;
    }

    setLoopVolume(key: string | undefined, volume: number, useMusicVolume = true): void {
        const targetKey = key || this.looping;

        if (!targetKey) {
            console.warn(`No key provided and no looping track is active.`);
            return;
        }

        if (!this.gainNodes.has(targetKey)) {
            console.warn(`Cannot set volume: No audio is playing for key "${targetKey}".`);
            return;
        }

        if (volume < 0 || volume > 1) {
            console.warn(`Invalid volume level: ${volume}. Volume must be between 0.0 and 1.0.`);
            return;
        }

        const { gainNode } = this.gainNodes.get(targetKey)!;
        gainNode.gain.value = volume * this.masterVolume * (useMusicVolume ? this.musicVolume_ : this.effectVolume_);
    }

    pause(): void {
        if (this.context) {
            this.context.suspend().then(() => {
                console.warn('AudioContext paused.');
            }).catch(error => {
                console.error('Failed to pause AudioContext:', error);
            });
        }
    }
    
    play(): void {
        if (this.context) {
            this.context.resume().then(() => {
                console.warn('AudioContext resumed.');
            }).catch(error => {
                console.error('Failed to resume AudioContext:', error);
            });
        }
    }
    
    stopAll(): void {
        if (!this.context) {
            return;
        }

        this.playingEffects.forEach(({ source }) => {
            source.stop();
        });

        this.playingEffects = [];
    }
}

export default AudioManager;
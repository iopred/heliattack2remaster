type LyricEvent = {
    time: number; // The timing in seconds when the lyric is played
    text: string; // The lyric text
};

type TimelineEvent = {
    time: number;
    dimensions: number[];
    x: number,
    y: number,
    z: number,
    dimension: number,
    text?: string; // The text at this event.
}

class Timeline {
    // Sorted.
    private lyrics: LyricEvent[] = [];
    private audioManager: AudioManager;
    private bpm: number;
    private timeSignature: number;
    private started = true;
    private listener = null;
    private lastTime;

    constructor(audioManager: AudioManager, kitString: string, bpm: number, timeSignature:number, listener) {
        this.audioManager = audioManager;
        this.parseLyrics(kitString);
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.listener = listener;
    }

    public get currentTime():Number {
        return this.audioManager.currentTime;
    }

    // Parses the lyrics string and populates the lyrics array
    private parseLyrics(lyricsString: string): void {
        const entries = lyricsString.split("\n");

        let currentTime = 0;

        this.lyrics = entries.map(entry => {
            // Calculate the time for this lyric using the BPM
            const timePerBeat = 60 / this.bpm; // Time for each beat in seconds
            currentTime += timePerBeat; // Increment the time based on the beats

            return { currentTime, entry };
        });

        // Sort lyrics by time for safe playback
        this.lyrics.sort((a, b) => a.time - b.time);
    }

    public dispatchLyrics(startTime: number, endTime: number): void {
        if (!startTime) {
            startTime = 0;
        }
        if (endTime) {
            endTime = 1;
        }
        // Get lyrics that are within the time window
        const lyricsToShow = this.lyrics.filter(lyric => lyric.time >= startTime && lyric.time <= endTime);
        
        // Display each lyric
        lyricsToShow.forEach(lyric => this.displayLyric(lyric.text));
    }

    // Starts playback of lyrics based on the current time of audio playback
    public startPlayback(): void {
        this.started = true;
    }

    public getLyricEventsBetweenTimes(startTime:number, endTime:number);
    public dispatchLyrics(startTime:number, endTime:number);

    // Displays the lyric (can be replaced with custom logic to render lyrics on screen)
    private displayLyric(text: string): void {
        if (this.listener) {
            this.listener.displayLyric(text);
        }
    }

    // Optionally add a method to get all lyrics for debugging or other purposes
    public getLyrics(): LyricEvent[] {
        return this.lyrics;
    }

    public update():void {
        const currentTime = this.audioManager.getCurrentTime();
        this.dispatchLyrics(currentTime - this.lastTime, currentTime);
    }
}

export default Timeline;
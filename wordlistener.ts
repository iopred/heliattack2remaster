type Listener = (word: string) => void;

class WordListener {
    private targetWord: string;
    private listeners: Listener[];

    constructor(targetWord: string = 'iopred') {
        this.targetWord = targetWord;
        this.listeners = [];
    }

    /**
     * Attach a listener that will be fired when the word is detected.
     * @param listener The callback function to execute.
     */
    onWordDetected(listener: Listener): void {
        this.listeners.push(listener);
    }

    /**
     * Start listening for the target word in a given input stream.
     * @param input The input string to monitor.
     */
    listen(input: string): void {
        if (input.includes(this.targetWord)) {
            this.emit(this.targetWord);
        }
    }

    /**
     * Emit the event to all listeners.
     * @param word The word that was detected.
     */
    private emit(word: string): void {
        for (const listener of this.listeners) {
            listener(word);
        }
    }
}

export default WordListener;
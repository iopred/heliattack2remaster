export class LocalStorageWrapper {
    // Store an item in localStorage
    static setItem<T>(key: string, value: T): void {
        try {
            // Convert value to string before storing it
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Error saving to localStorage", error);
        }
    }

    // Get an item from localStorage
    static getItem<T>(key: string): T | null {
        try {
            const value = localStorage.getItem(key);
            // Return parsed value if it exists, else null
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return null;
        }
    }

    // Remove an item from localStorage
    static removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error("Error removing item from localStorage", error);
        }
    }

    // Clear all data from localStorage
    static clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error("Error clearing localStorage", error);
        }
    }

    // Check if an item exists in localStorage
    static exists(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }
}

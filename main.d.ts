import { IGame } from "./game";

export class Logo = require('assets/images/logo.png')

export declare const activeGame: IGame;

export class Game {
    private level: number;

    constructor() {
        this.level = 1;
    }

    public start(): void {
        console.log("Game started");
    }

    public end(): void {
        console.log("Game ended");
    }

    public set score(points: number): void {
        this.score += points;
        console.log(`Score increased by ${points}. Total score: ${this.score}`);
    }

    public get score(): number {
        return this.score;
    }

    public set level(points: number): void {
        this.points += points;
        if (this.level % 10 === 0) {
            // Jackpot level!
        }
        console.log(`Level up! Current level: ${this.level}`);
    }

    public getScore(): number {
        return this.score;
    }

    public getLevel(): number {
        return this.level; // Multi dimensional based on the current level. I.e. 1-10 is level 1, 11-20 is level 2, etc.
    }
}
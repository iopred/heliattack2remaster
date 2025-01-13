import Game from "../game";
import { activeGame } from "../main";

class Kit extends Game {
    private kit: string = "kat";
    private game: string;

    constructor() {
        super(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14);
        this.game = "naamba:🚁";
    }

    public getKit(): string {
        return this.game;
    }

    public async setKat(kat: string): Promise<Kit> {
        console.log(`Kit changed to ${kat}`);
        await this.loadGame(kat);
        return this;
    }

    async loadGame(kat: string): Promise<string> {
        return await activeGame.load(kat);
    }
}
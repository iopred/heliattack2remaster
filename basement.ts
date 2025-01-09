import { jwtDecode } from "jwt-decode";
import { v7 as uuidv7} from 'uuid';
import { LocalStorageWrapper } from './localstoragewrapper';

const API_BASE_URL = 'https://api.basement.fun';
const LAUNCHER_ENDPOINT = 'launcher';
const SCORES_ENDPOINT = 'scores';
const LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY:string = 'b3-launcher-jwt';

export enum NotificationType {
    Success = 'success',
    Error = 'error',
}

export class Basement {
    public readonly gameId:string;
    public readonly userId:string;
    private jwt:string;
    private decodedJwt:any;
    private heartbeatInterval:number;

    constructor(window:Window) {
        // Check if the token is in the query string
        const queryString = window.location.search;
        const parameters = new URLSearchParams(queryString);
        const value = parameters.get('token');
        const jwt = value ?? LocalStorageWrapper.getItem<string>(LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY);
        if (!jwt) {
            console.error('Basement: Unable to find token in query string or local storage.');
            return
        }
        LocalStorageWrapper.setItem(LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY, jwt);

        this.jwt = jwt;
        this.decodedJwt = jwtDecode(jwt);

        this.userId = this.decodedJwt.userId;
        this.gameId = this.decodedJwt.gameId;

        if (!this.userId || !this.gameId) {
            console.error('Basement: Unable to find userId or gameId in token.');
            return
        }

        this.heartbeatInterval = setInterval(() => this.heartbeat(), 2*60*1000);
    }

    public async heartbeat(): Promise<Response> {        
        const heartbeatRequest = this.makeRequest(LAUNCHER_ENDPOINT, 'channelHeartbeat');

        heartbeatRequest.catch((error) => {
            console.error('Basement: Heartbeat failed, clearing interval.');
            clearInterval(this.heartbeatInterval);
        });

        return heartbeatRequest;
    }

    public async getChannelStatus(): Promise<Response> {
        return this.makeRequest(LAUNCHER_ENDPOINT, 'channelStatus');
    }

    public async getLeaderboard(limit:number = 50, skip:number = 0): Promise<Response> {
        return this.makeRequest(SCORES_ENDPOINT, 'getGameScoresLeaderboard', { gameId: this.gameId, limit, skip }, /** appendJwt */ false);
    }

    public async sendNotification(message:string, type:NotificationType): Promise<Response> {
        return this.makeRequest(LAUNCHER_ENDPOINT, 'sendNotification', { message, type });
    }

    public async setUserScore(score:number): Promise<Response> {
        let nonce = `nonce=${uuidv7()}`;
        return this.makeRequest(LAUNCHER_ENDPOINT, 'setUserScore', { nonce, score });
    }

    private async makeRequest(endpoint:string, method:string, parameters:Object | null = null, appendJwt:boolean = true): Promise<Response> {
        if (!this.jwt) {
            throw new Error(`Basement: Cannot make request to ${endpoint}/${method}: No login found, please request this page through the Basement Launcher.`);
        }
        const headers = new Headers();
        headers.append('X-Service-Method', method);
        headers.append('Content-Type', 'application/json');

        const body = { ...parameters };

        if (appendJwt) {
            body['launcherJwt'] = this.jwt; 
        }

        const requestOptions:RequestInit = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            redirect: 'follow',
        };

        return fetch(`${API_BASE_URL}/${endpoint}`, requestOptions).then(async response => {
            if (!response.ok) {
                throw new Error(`Basement: Request to ${endpoint}/${method} failed: ${await response.text()}`);
            }
            return response.json();
        });
    }
}
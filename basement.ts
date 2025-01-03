import { jwtDecode } from "jwt-decode";
import { LocalStorageWrapper } from './localstoragewrapper';

const API_BASE_URL = 'https://api.basement.fun/launcher/';
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
        const heartbeatRequest = this.makeRequest('channelHeartbeat');

        heartbeatRequest.catch((error) => {
            console.error('Basement: Heartbeat failed, clearing interval.');
            clearInterval(this.heartbeatInterval);
        });

        return heartbeatRequest;
    }

    public async getChannelStatus(): Promise<Response> {
        return this.makeRequest('channelStatus');
    }

    public async getLeaderboard(limit:number = 50, skip:number = 0): Promise<Response> {
        return this.makeRequest('getGameScoresLeaderboard', { gameId: this.gameId, limit, skip });
    }

    public async sendNotification(message:string, type:NotificationType): Promise<Response> {
        return this.makeRequest('sendNotification', { message, type });
    }

    private async makeRequest(endpoint:string, parameters:Object | null = null): Promise<Response> {
        if (!this.jwt) {
            throw new Error(`Basement: Cannot make request to ${endpoint}: No login found, please request this page through the Basement Launcher.`);
        }
        const headers = new Headers();
        headers.append('X-Service-Method', endpoint);

        const requestOptions:RequestInit = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ ...parameters, launcherJwt: this.jwt }),
        };

        return fetch(API_BASE_URL, requestOptions).then(async response => {
            if (!response.ok) {
                throw new Error(`Basement: Request to ${endpoint} failed: ${await response.text()}`);
            }
            return  response.json();
        });
    }
}
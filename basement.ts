import { LocalStorageWrapper } from './localstoragewrapper';

const API_BASE_URL = 'https://api.basement.fun/launcher/';
const LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY:string = 'b3-launcher-jwt';

export default class Basement {
    private jwt:string;

    constructor(window:Window) {
        //get and store JWT
        const queryString = window.location.search;
        const parameters = new URLSearchParams(queryString);
        const value = parameters.get('token');
        const jwt = value ?? LocalStorageWrapper.getItem<string>(LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY);
        if (!jwt) {
            console.error('Basement: Unable to find token in query string or local storage');
            return
        }
        LocalStorageWrapper.setItem(LOCAL_STORAGE_B3_LAUNCHER_JWT_KEY, jwt);

        this.jwt = jwt;

        setInterval(() => this.heartbeat, 2*60*1000);
    }

    public async heartbeat(): Promise<Response> {        
        return this.makeRequest('channelHeartbeat');
    }

    public async getChannelStatus(): Promise<Response> {
        return this.makeRequest('channelStatus');
    }

    private async makeRequest(endpoint:string): Promise<Response> {
        if (!this.jwt) {
            console.error('Basement: Cannot make request to ${endpoint}: No login found, please request this page through the Basement Launcher.')
        }
        var headers = new Headers();
        headers.append('X-Service-Method', endpoint);

        var requestOptions:RequestInit = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({launcherJwt: this.jwt}),
        };

        return fetch(API_BASE_URL, requestOptions);
    }
}
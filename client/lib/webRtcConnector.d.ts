import { Socket } from 'socket.io-client';
import { EventEmitter, Listener } from 'events';
declare class WebRtc {
    #private;
    id: null | string;
    recipientId: null | string;
    keyExchangedEnded: boolean;
    negotiationStarter: boolean;
    socket: Socket;
    isConnected: boolean;
    peerBrowser: {
        browser: string;
        version: string;
    } | null;
    peerConnection: RTCPeerConnection;
    eventEmitter: EventEmitter;
    dataChannel: RTCDataChannel | null;
    dataChannelState: 'close' | 'open';
    remoteStream: MediaStream | null;
    selfKeyObj: {
        publicKey: string;
        publicKeyFormat: string;
        privateKey: string;
        privateKeyFormat: string;
    } | null;
    peerPublicKey: string | null;
    constructor({ serverUrl, connectionEvent, onPeerConnection }: {
        serverUrl: string;
        connectionEvent: Function | null;
        onPeerConnection: Function | null;
    });
    on: (event: string, eventHandler: Listener) => void;
    restartIce: () => Promise<void>;
    canUpdateMedia: () => boolean;
    updateMedia: (mediaStream: MediaStream) => Promise<boolean>;
    makeMediaConnection: (mediaStream: MediaStream, { id: peerId, secret }: {
        id: string;
        secret: string;
    }) => Promise<void>;
    answerMediaConnection: (mediaStream: MediaStream) => Promise<void>;
    dataConnection: ({ id: peerId, secret }: {
        id: string;
        secret: string;
    }) => Promise<void>;
    generateWebrtcHash: (hashMethod?: string) => Promise<{
        status: string;
        hash: null | string;
        errorMessage: null | string;
    }>;
    logDescriptions: () => Promise<void>;
    sendMessage: (data: string) => Promise<string>;
    close: () => Promise<void>;
}
export default WebRtc;

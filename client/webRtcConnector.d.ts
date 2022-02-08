import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { Listener } from 'events/index';

// webrtc types
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

// crypto types
export declare const str2ab: (str: string) => ArrayBuffer;
export declare const ab2str: (buf: ArrayBuffer) => string;
export declare const aesKeyGenerate: () => Promise<{
    key: string;
    keyFormat: string;
}>;
export declare const aesEncrypt: (data: string | object, secretKey: string) => Promise<string>;
export declare const aesDecrypt: (encryptedDataString: string, secretKey: string) => Promise<string>;
export declare const ecdhGenerateKey: () => Promise<{
    publicKey: string;
    publicKeyFormat: string;
    privateKey: string;
    privateKeyFormat: string;
}>;
export declare const ecdhSecretKey: (privateKey: string, publicKey: string) => Promise<string>;

// hex generator types
export declare const generateRandomHexValue: (length?: number) => string;

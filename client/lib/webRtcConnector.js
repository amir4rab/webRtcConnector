"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _WebRtc_acceptKey, _WebRtc_sharedSecret, _WebRtc_internalEventEmitter, _WebRtc_currentMediaTracks, _WebRtc_recipientSecret, _WebRtc_generateKey, _WebRtc_afterKeyExchange, _WebRtc_connect, _WebRtc_setupMediaConnection, _WebRtc_onDataChannelOpenEvent;
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const events_1 = require("events");
const webrtc_adapter_1 = __importDefault(require("webrtc-adapter"));
const crypto_1 = require("./utils/crypto");
const generateRandomHexValue_1 = __importDefault(require("./utils/generateRandomHexValue"));
const rtcConfiguration = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};
const notInitWarn = () => console.warn('Received RTCSessionDescription before RTCPeerConnection initialization!');
class WebRtc {
    constructor({ serverUrl, connectionEvent = null, onPeerConnection = null }) {
        _WebRtc_acceptKey.set(this, void 0);
        _WebRtc_sharedSecret.set(this, void 0);
        _WebRtc_internalEventEmitter.set(this, void 0);
        _WebRtc_currentMediaTracks.set(this, void 0);
        _WebRtc_recipientSecret.set(this, void 0);
        _WebRtc_generateKey.set(this, async () => {
            this.selfKeyObj = await (0, crypto_1.ecdhGenerateKey)();
        });
        _WebRtc_afterKeyExchange.set(this, async () => {
            __classPrivateFieldGet(this, _WebRtc_internalEventEmitter, "f").emit('afterKeyExchange', null);
        });
        this.on = (event, eventHandler) => {
            this.eventEmitter.on(event, eventHandler);
        };
        _WebRtc_connect.set(this, async (peerId, secret) => {
            if (!this.isConnected) {
                throw Error(`socket isn't connected to the server!`);
            }
            __classPrivateFieldSet(this, _WebRtc_recipientSecret, secret, "f");
            this.recipientId = peerId;
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            console.log('"Local" description has been configured!');
            const encryptedData = await (0, crypto_1.aesEncrypt)({
                messageType: 'offer',
                data: offer,
                secret: secret,
                peerSecret: __classPrivateFieldGet(this, _WebRtc_acceptKey, "f"),
                browser: webrtc_adapter_1.default.browserDetails
            }, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
            this.negotiationStarter = true;
            this.socket.emit('message', {
                recipientId: peerId,
                encryptedData
            });
        });
        _WebRtc_setupMediaConnection.set(this, (mediaStream) => {
            mediaStream.getTracks().forEach(track => {
                const sender = this.peerConnection.addTrack(track, mediaStream);
                __classPrivateFieldGet(this, _WebRtc_currentMediaTracks, "f").push(sender);
            });
        });
        this.restartIce = async () => {
            this.peerConnection.restartIce();
            await __classPrivateFieldGet(this, _WebRtc_connect, "f").call(this, this.recipientId, __classPrivateFieldGet(this, _WebRtc_recipientSecret, "f"));
        };
        this.canUpdateMedia = () => {
            return webrtc_adapter_1.default.browserDetails.browser === this.peerBrowser.browser;
        };
        this.updateMedia = async (mediaStream) => {
            if (!this.canUpdateMedia()) {
                console.error('Cross browser media update is not possible!');
                return false;
            }
            __classPrivateFieldGet(this, _WebRtc_currentMediaTracks, "f").forEach(track => {
                this.peerConnection.removeTrack(track);
            });
            __classPrivateFieldSet(this, _WebRtc_currentMediaTracks, [], "f");
            mediaStream.getTracks().forEach(track => {
                const sender = this.peerConnection.addTrack(track, mediaStream);
                __classPrivateFieldGet(this, _WebRtc_currentMediaTracks, "f").push(sender);
            });
            await this.restartIce();
            return true;
        };
        this.makeMediaConnection = async (mediaStream, { id: peerId, secret }) => {
            await __classPrivateFieldGet(this, _WebRtc_generateKey, "f").call(this);
            this.socket.emit('keyExchange', {
                recipientId: peerId,
                data: JSON.stringify({
                    messageType: 'offer',
                    data: this.selfKeyObj.publicKey,
                })
            });
            __classPrivateFieldGet(this, _WebRtc_internalEventEmitter, "f").on('afterKeyExchange', async (_) => {
                __classPrivateFieldGet(this, _WebRtc_setupMediaConnection, "f").call(this, mediaStream);
                __classPrivateFieldGet(this, _WebRtc_connect, "f").call(this, peerId, secret);
            });
        };
        this.answerMediaConnection = async (mediaStream) => {
            __classPrivateFieldGet(this, _WebRtc_setupMediaConnection, "f").call(this, mediaStream);
        };
        _WebRtc_onDataChannelOpenEvent.set(this, async () => {
            this.dataChannelState = 'open';
            this.eventEmitter.emit('onDataChannel', this.dataChannel);
            this.dataChannel.onmessage = async (message) => {
                const decryptedMessage = await (0, crypto_1.aesDecrypt)(message.data, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
                this.eventEmitter.emit('onMessage', decryptedMessage);
            };
        });
        this.dataConnection = async ({ id: peerId, secret }) => {
            await __classPrivateFieldGet(this, _WebRtc_generateKey, "f").call(this);
            this.socket.emit('keyExchange', {
                recipientId: peerId,
                data: JSON.stringify({
                    messageType: 'offer',
                    data: this.selfKeyObj.publicKey,
                })
            });
            __classPrivateFieldGet(this, _WebRtc_internalEventEmitter, "f").on('afterKeyExchange', async (_) => {
                this.dataChannel = this.peerConnection.createDataChannel('messageDataChannel');
                console.log(`Data channel has been created!`);
                this.dataChannel.onopen = __classPrivateFieldGet(this, _WebRtc_onDataChannelOpenEvent, "f");
                this.dataChannel.onclose = _ => this.dataChannelState = 'close';
                await __classPrivateFieldGet(this, _WebRtc_connect, "f").call(this, peerId, secret);
            });
        };
        this.generateWebrtcHash = async (hashMethod = 'SHA-256') => {
            var _a, _b, _c, _d;
            if (((_b = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.currentLocalDescription) === null || _b === void 0 ? void 0 : _b.sdp) === null || ((_d = (_c = this.peerConnection) === null || _c === void 0 ? void 0 : _c.currentRemoteDescription) === null || _d === void 0 ? void 0 : _d.sdp) === null) {
                return ({
                    status: 'error',
                    errorMessage: 'Values are not available!',
                    hash: null
                });
            }
            try {
                const selfSdp = this.peerConnection.currentLocalDescription.sdp;
                const remoteSdp = this.peerConnection.currentRemoteDescription.sdp;
                const selfFingerPrint = selfSdp.slice(selfSdp.indexOf('fingerprint'), selfSdp.indexOf('fingerprint') + 115);
                const remoteFingerPrint = remoteSdp.slice(remoteSdp.indexOf('fingerprint'), remoteSdp.indexOf('fingerprint') + 115);
                const selfIdentifier = `${selfFingerPrint}${this.selfKeyObj.publicKey}`;
                const peerIdentifier = `${remoteFingerPrint}${this.peerPublicKey}`;
                const text = this.negotiationStarter ? `${selfIdentifier}${peerIdentifier}` : `${peerIdentifier}${selfIdentifier}`;
                const encoder = new TextEncoder();
                const data = encoder.encode(text); // encode as (utf-8) Uint8Array
                const hashBuffer = await crypto.subtle.digest(hashMethod, data); // hash the message
                const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
                return ({
                    status: 'successful',
                    hash: hashHex,
                    errorMessage: null
                });
            }
            catch (_e) {
                return ({
                    status: 'error',
                    errorMessage: 'something went wrong on the hash digestion!',
                    hash: null
                });
            }
        };
        this.logDescriptions = async () => {
            const hashObj = await this.generateWebrtcHash();
            const descriptions = {
                hashObj,
                negotiationStarter: this.negotiationStarter,
                peerBrowser: this.peerBrowser,
                canUpdateMedia: this.canUpdateMedia()
            };
            this.eventEmitter.emit('descriptionsCompleted', descriptions);
        };
        this.sendMessage = (data) => new Promise(async (resolve, reject) => {
            try {
                const encryptedMessage = await (0, crypto_1.aesEncrypt)(data, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
                this.dataChannel.send(encryptedMessage);
                resolve('successful');
            }
            catch (_a) {
                reject('some thing went wrong!');
            }
        });
        this.close = async () => {
            this.socket.disconnect();
            this.peerConnection.close();
        };
        this.id = null; // self socket.io server id
        __classPrivateFieldSet(this, _WebRtc_acceptKey, (0, generateRandomHexValue_1.default)(16), "f"); // self communication secret
        this.recipientId = null; // recipient socket.io server id
        __classPrivateFieldSet(this, _WebRtc_recipientSecret, null, "f"); // recipient communication secret
        this.keyExchangedEnded = false;
        this.negotiationStarter = false;
        this.socket = (0, socket_io_client_1.io)(serverUrl);
        this.isConnected = false;
        this.peerBrowser = null;
        this.peerConnection = new RTCPeerConnection(rtcConfiguration);
        this.eventEmitter = new events_1.EventEmitter();
        __classPrivateFieldSet(this, _WebRtc_internalEventEmitter, new events_1.EventEmitter(), "f");
        this.dataChannel = null;
        this.dataChannelState = 'close';
        this.remoteStream = null;
        this.selfKeyObj = null;
        this.peerPublicKey = null;
        __classPrivateFieldSet(this, _WebRtc_sharedSecret, null, "f");
        __classPrivateFieldSet(this, _WebRtc_currentMediaTracks, [], "f");
        this.socket.on('connection', ({ id }) => {
            this.id = id;
            this.isConnected = true;
            if (connectionEvent !== null)
                connectionEvent({ id, secret: __classPrivateFieldGet(this, _WebRtc_acceptKey, "f") });
            this.eventEmitter.emit('onConnection', ({ id, secret: __classPrivateFieldGet(this, _WebRtc_acceptKey, "f") }));
        });
        this.socket.on('keyExchange', async ({ data: keyExchangeData, from }) => {
            var _a;
            if (typeof keyExchangeData !== 'string') {
                console.error('False information has been received from signaling Server!');
                return;
            }
            ;
            if (this.keyExchangedEnded)
                return;
            const { data, messageType } = JSON.parse(keyExchangeData);
            switch (messageType) {
                case 'offer': {
                    this.peerPublicKey = data;
                    await __classPrivateFieldGet(this, _WebRtc_generateKey, "f").call(this);
                    __classPrivateFieldSet(this, _WebRtc_sharedSecret, await (0, crypto_1.ecdhSecretKey)(this.selfKeyObj.privateKey, this.peerPublicKey), "f");
                    this.keyExchangedEnded = true;
                    this.socket.emit('keyExchange', {
                        recipientId: from,
                        data: JSON.stringify({
                            data: (_a = this.selfKeyObj) === null || _a === void 0 ? void 0 : _a.publicKey,
                            messageType: 'answer',
                        })
                    });
                    break;
                }
                case 'answer': {
                    this.peerPublicKey = data;
                    __classPrivateFieldSet(this, _WebRtc_sharedSecret, await (0, crypto_1.ecdhSecretKey)(this.selfKeyObj.privateKey, this.peerPublicKey), "f");
                    this.keyExchangedEnded = true;
                    __classPrivateFieldGet(this, _WebRtc_afterKeyExchange, "f").call(this);
                    break;
                }
            }
        });
        this.socket.on('message', async ({ encryptedData = null, from }) => {
            if (typeof encryptedData !== 'string') {
                console.error('False information has been received from signaling Server!');
                return;
            }
            ;
            const deData = await (0, crypto_1.aesDecrypt)(encryptedData, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
            const { data: dataObj, peerSecret = null, secret: communicationKey, messageType, browser = null } = JSON.parse(deData);
            if (communicationKey !== __classPrivateFieldGet(this, _WebRtc_acceptKey, "f")) {
                console.warn(`key was false or null! communicationKey: ${communicationKey}, messageType: ${messageType}`);
                return;
            }
            ;
            switch (messageType) {
                case 'answer': {
                    if (this.peerConnection === null) {
                        notInitWarn();
                        return;
                    }
                    ;
                    this.peerBrowser = browser;
                    const remoteDesc = new RTCSessionDescription(dataObj);
                    await this.peerConnection.setRemoteDescription(remoteDesc);
                    console.log('"Remote" description has been configured!');
                    __classPrivateFieldGet(this, _WebRtc_internalEventEmitter, "f").emit('afterDescription', null);
                    break;
                }
                case 'offer': {
                    if (communicationKey !== __classPrivateFieldGet(this, _WebRtc_acceptKey, "f"))
                        return;
                    this.recipientId = from;
                    this.eventEmitter.emit('onConnectionToRecipient', from);
                    __classPrivateFieldSet(this, _WebRtc_recipientSecret, peerSecret, "f");
                    this.peerBrowser = browser;
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(dataObj));
                    console.log('"Remote" description has been configured!');
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    console.log('"Local" description has been configured!');
                    const encryptedData = await (0, crypto_1.aesEncrypt)({
                        messageType: 'answer',
                        data: answer,
                        secret: __classPrivateFieldGet(this, _WebRtc_recipientSecret, "f"),
                        browser: webrtc_adapter_1.default.browserDetails,
                    }, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
                    this.socket.emit('message', {
                        recipientId: this.recipientId,
                        encryptedData
                    });
                    break;
                }
                case 'new-ice-candidate': {
                    if (this.peerConnection === null) {
                        notInitWarn();
                        return;
                    }
                    ;
                    try {
                        await this.peerConnection.addIceCandidate(dataObj);
                    }
                    catch (e) {
                        console.error('Error adding received ice candidate', e);
                    }
                    break;
                }
            }
        });
        //** Ice Candidates Event **// 
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                const encryptedData = await (0, crypto_1.aesEncrypt)({
                    messageType: 'new-ice-candidate',
                    data: event.candidate,
                    secret: __classPrivateFieldGet(this, _WebRtc_recipientSecret, "f")
                }, __classPrivateFieldGet(this, _WebRtc_sharedSecret, "f"));
                if (this.recipientId !== null)
                    this.socket.emit('message', {
                        recipientId: this.recipientId,
                        encryptedData
                    });
            }
        };
        //** Connection State Event **// 
        this.peerConnection.addEventListener('connectionstatechange', _ => {
            if (this.peerConnection.connectionState === 'connected') {
                if (onPeerConnection !== null)
                    onPeerConnection(true);
            }
        }, false);
        this.peerConnection.addEventListener('iceconnectionstatechange', _ => {
            if (this.peerConnection.iceConnectionState === 'disconnected') { //** gets called when connection has been closed **//
                console.error('Connection has been closed!');
                this.eventEmitter.emit('onClose', null);
            }
            else if (this.peerConnection.iceConnectionState === 'failed') { //** gets called when something went wrong **//
                console.error('Something went wrong!');
                this.eventEmitter.emit('onError', null);
            }
            ;
        }, false);
        //** Connection Events **// 
        this.peerConnection.addEventListener('datachannel', event => {
            this.dataChannel = event.channel;
            this.dataChannel.onopen = __classPrivateFieldGet(this, _WebRtc_onDataChannelOpenEvent, "f");
            this.dataChannel.onclose = _ => this.dataChannelState = 'close';
        }, false);
        this.peerConnection.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;
            this.remoteStream = remoteStream;
            this.eventEmitter.emit('onStream', remoteStream);
        }, false);
    }
    ;
}
_WebRtc_acceptKey = new WeakMap(), _WebRtc_sharedSecret = new WeakMap(), _WebRtc_internalEventEmitter = new WeakMap(), _WebRtc_currentMediaTracks = new WeakMap(), _WebRtc_recipientSecret = new WeakMap(), _WebRtc_generateKey = new WeakMap(), _WebRtc_afterKeyExchange = new WeakMap(), _WebRtc_connect = new WeakMap(), _WebRtc_setupMediaConnection = new WeakMap(), _WebRtc_onDataChannelOpenEvent = new WeakMap();
exports.default = WebRtc;

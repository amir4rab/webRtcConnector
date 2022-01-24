import { io } from 'socket.io-client';
import EventEmitter from 'events';
import adapter from 'webrtc-adapter';

import { aesEncrypt, aesDecrypt, ecdhGenerateKey, ecdhSecretKey } from './utils/crypto.js';
import generateRandomHexValue from './utils/generateRandomHexValue.js';



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
  #acceptKey;
  #sharedSecret;
  #internalEventEmitter;
  #currentMediaTracks;
  #recipientSecret;
  constructor({ serverUrl ,connectionEvent = null, onPeerConnection= null }){
    this.id = null; // self socket.io server id
    this.#acceptKey = generateRandomHexValue(16); // self communication secret
    this.recipientId = null; // recipient socket.io server id
    this.#recipientSecret = null; // recipient communication secret

    this.keyExchangedEnded = false;

    this.negotiationStarter = false;
    this.socket = io(serverUrl);
    this.isConnected = false;
    this.peerBrowser = null;

    this.peerConnection = new RTCPeerConnection(rtcConfiguration);
    this.eventEmitter = new EventEmitter();
    this.#internalEventEmitter = new EventEmitter();

    this.dataChannel = null;
    this.dataChannelState = 'close';

    this.remoteStream = null;

    this.selfKeyObj = null;
    this.peerPublicKey = null;
    this.#sharedSecret = null;

    this.#currentMediaTracks = [];

    this.socket.on( 'connection', ({ id }) => {
      this.id = id
      this.isConnected = true;
      if ( connectionEvent !== null ) connectionEvent({ id, secret: this.#acceptKey });
      this.eventEmitter.emit('onConnection', ({ id, secret: this.#acceptKey }))
    })

    this.socket.on( 'keyExchange', async ({ data: keyExchangeData, from }) => {
      if ( typeof keyExchangeData !== 'string' ) {
        console.error('False information has been received from signaling Server!');
        return;
      };
      if ( this.keyExchangedEnded ) return;
      const { data, messageType } = JSON.parse(keyExchangeData);

      switch (messageType) {
        case 'offer': {
          this.peerPublicKey = data;
          await this.#generateKey();
          this.#sharedSecret = await ecdhSecretKey(this.selfKeyObj.privateKey, this.peerPublicKey);
          this.keyExchangedEnded = true;

          this.socket.emit('keyExchange', {
            recipientId: from,
            data: JSON.stringify({
              data: this.selfKeyObj.publicKey,
              messageType: 'answer',
            })
          });

          break;
        }
        case 'answer': {
          this.peerPublicKey = data;
          this.#sharedSecret = await ecdhSecretKey(this.selfKeyObj.privateKey, this.peerPublicKey);
          this.keyExchangedEnded = true;

          this.#afterKeyExchange();
          break;
        }
      }
    });

    this.socket.on( 'message', async ({ encryptedData= null, from }) => {
      if ( typeof encryptedData !== 'string' ) {
        console.error('False information has been received from signaling Server!');
        return;
      };

      const deData = await aesDecrypt(encryptedData, this.#sharedSecret);
      const { data: dataObj, peerSecret= null, secret: communicationKey, messageType, browser = null } = JSON.parse(deData)
      if ( communicationKey !== this.#acceptKey ) {
        console.warn(`key was false or null! communicationKey: ${communicationKey}, messageType: ${messageType}`)
        return;
      };

      switch( messageType ){
        case 'answer': {
          if ( this.peerConnection === null ) {
            notInitWarn();
            return;
          };

          this.peerBrowser = browser;
          const remoteDesc = new RTCSessionDescription(dataObj);
          await this.peerConnection.setRemoteDescription(remoteDesc);
          console.log('"Remote" description has been configured!');

          this.#internalEventEmitter.emit('afterDescription', null);
          this.logDescriptions();
          break;
        }
        case 'offer': {
          if ( communicationKey !== this.#acceptKey ) return;
          this.recipientId = from;
          this.eventEmitter.emit('onConnectionToRecipient', from);
          this.#recipientSecret = peerSecret;
          this.peerBrowser = browser;

          console.log(dataObj);
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(dataObj));
          console.log('"Remote" description has been configured!');

          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('"Local" description has been configured!');
          this.logDescriptions();

          const encryptedData = await aesEncrypt({
            messageType: 'answer',
            data: answer,
            secret: this.#recipientSecret,
            browser: adapter.browserDetails,
          }, this.#sharedSecret )

          this.socket.emit('message', {
            recipientId: this.recipientId,
            encryptedData
          })
          break;
        }
        case 'new-ice-candidate': {
          if ( this.peerConnection === null ) {
            notInitWarn();
            return;
          };
          try {
            await this.peerConnection.addIceCandidate(dataObj);
          } catch(e) {
            console.error('Error adding received ice candidate', e);
          }
          break;
        }
      }
    });

    //** Ice Candidates Event **// 
    this.peerConnection.onicecandidate = async (event) => {
      if ( event.candidate ) {
        const encryptedData = await aesEncrypt({
          messageType: 'new-ice-candidate',
          data: event.candidate,
          secret: this.#recipientSecret
        }, this.#sharedSecret);

        if( this.recipientId !== null ) this.socket.emit('message', {
          recipientId: this.recipientId,
          encryptedData
        })
      }
    };

    //** Connection State Event **// 
    this.peerConnection.addEventListener( 'connectionstatechange', _ => {
      if (this.peerConnection.connectionState === 'connected') {
        if ( onPeerConnection !== null ) onPeerConnection(true);
      }
    }, false);
    this.peerConnection.addEventListener( 'iceconnectionstatechange', _ => {
      if( this.peerConnection.iceConnectionState === 'disconnected' ) { //** gets called when connection has been closed **//
        console.error('Connection has been closed!');
        this.eventEmitter.emit('onClose', null);
      } else if ( this.peerConnection.iceConnectionState === 'failed' ) { //** gets called when something went wrong **//
        console.error('Something went wrong!');
        this.eventEmitter.emit('onError', null);
      };
    }, false);

    //** Connection Events **// 
    this.peerConnection.addEventListener( 'datachannel', event => {
      this.dataChannel = event.channel;

      this.dataChannel.onopen = this.#onDataChannelOpenEvent;

      this.dataChannel.onclose = _ => this.dataChannelState = 'close';
    }, false);
    this.peerConnection.addEventListener( 'track', async (event) => {
      console.log('track received!', event.streams)
      const [remoteStream] = event.streams;
      this.remoteStream = remoteStream;
      this.eventEmitter.emit('onStream', remoteStream);
    }, false);
    
  };

  #generateKey = async _ => {
    this.selfKeyObj = await ecdhGenerateKey();
  };

  #afterKeyExchange = async _ => {
    this.#internalEventEmitter.emit( 'afterKeyExchange', null );
  };

  on = (event, eventHandler) => {
    this.eventEmitter.on(event, eventHandler);
  };

  #connect = async ( peerId, secret ) => {
    if ( !this.isConnected ) {
      throw Error(`socket isn't connected to the server!`);
    }

    this.#recipientSecret = secret;
    this.recipientId = peerId

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('"Local" description has been configured!');

    const encryptedData = await aesEncrypt({
        messageType: 'offer',
        data: offer,
        secret: secret,
        peerSecret: this.#acceptKey,
        browser: adapter.browserDetails
    }, this.#sharedSecret);

    this.negotiationStarter = true;
    this.socket.emit('message', {
      recipientId: peerId,
      encryptedData
    })
  };

  #setupMediaConnection = ( mediaStream ) => {
    mediaStream.getTracks().forEach( track => {
      const sender =  this.peerConnection.addTrack(track, mediaStream);
      this.#currentMediaTracks.push(sender);
    });
  };

  restartIce = async () => {
    this.peerConnection.restartIce();
    await this.#connect( this.recipientId, this.#recipientSecret );
  }

  canUpdateMedia = () => {
    return adapter.browserDetails.browser === this.peerBrowser.browser;
  }

  updateMedia = async ( mediaStream ) => {
    if ( !this.canUpdateMedia() ) {
      console.error('Cross browser media update is not possible!');
      return false;
    }
    this.#currentMediaTracks.forEach( track => {
      this.peerConnection.removeTrack(track)
    });
    this.#currentMediaTracks = [];
    mediaStream.getTracks().forEach( track => {
      console.log(track)
      const sender =  this.peerConnection.addTrack(track, mediaStream);
      this.#currentMediaTracks.push(sender);
    });
    await this.restartIce();
    return true;
  }

  makeMediaConnection = async ( mediaStream, { id: peerId, secret } ) => {
    await this.#generateKey();

    this.socket.emit('keyExchange', {
      recipientId: peerId,
      data: JSON.stringify({
        messageType: 'offer',
        data: this.selfKeyObj.publicKey,
      })
    })

    this.#internalEventEmitter.on('afterKeyExchange', async _ => {
      this.#setupMediaConnection( mediaStream );
      this.#connect( peerId, secret );
    })
  };

  answerMediaConnection = async ( mediaStream ) => {
    this.#setupMediaConnection(mediaStream);
  };

  #onDataChannelOpenEvent = async () => {
    this.dataChannelState = 'open'
    this.eventEmitter.emit('onDataChannel', this.dataChannel);
    this.dataChannel.onmessage = async message => {
      const decryptedMessage = await aesDecrypt(
        message.data,
        this.#sharedSecret
      )
      this.eventEmitter.emit( 'onMessage', decryptedMessage );
    };
  };

  dataConnection = async ( { id: peerId, secret } ) => {
    await this.#generateKey();

    this.socket.emit('keyExchange', {
      recipientId: peerId,
      data: JSON.stringify({
        messageType: 'offer',
        data: this.selfKeyObj.publicKey,
      })
    
    })

    this.#internalEventEmitter.on('afterKeyExchange', async _ => {
      this.dataChannel = this.peerConnection.createDataChannel('messageDataChannel');
      console.log(`Data channel has been created!`);
  
      this.dataChannel.onopen = this.#onDataChannelOpenEvent;
  
      this.dataChannel.onclose = _ => this.dataChannelState = 'close';
      await this.#connect(peerId, secret);
    });
  };

  generateWebrtcHash = async ( hashMethod= 'SHA-256' ) => {
    if ( this.peerConnection?.currentLocalDescription?.sdp === null || this.peerConnection?.currentRemoteDescription?.sdp === null ) {
      return ({
        status: 'error',
        errorMessage: 'Values are not available!',
        hash: null
      });
    }
    try {
      const selfSdp= this.peerConnection.currentLocalDescription.sdp;
      const remoteSdp= this.peerConnection.currentRemoteDescription.sdp;
  
      const selfFingerPrint = selfSdp.slice(selfSdp.indexOf('fingerprint'), selfSdp.indexOf('fingerprint') + 115);
      const remoteFingerPrint = remoteSdp.slice(remoteSdp.indexOf('fingerprint'), remoteSdp.indexOf('fingerprint') + 115);

      const selfIdentifier = `${selfFingerPrint}${this.selfKeyObj.publicKey}`;
      const peerIdentifier = `${remoteFingerPrint}${this.peerPublicKey}`;
    
      const text = this.negotiationStarter ? `${selfIdentifier}${peerIdentifier}` : `${peerIdentifier}${selfIdentifier}`;
    
      const encoder = new TextEncoder();
      const data = encoder.encode(text);                                              // encode as (utf-8) Uint8Array
      const hashBuffer = await crypto.subtle.digest(hashMethod, data);                // hash the message
      const hashArray = Array.from(new Uint8Array(hashBuffer));                       // convert buffer to byte array
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');   // convert bytes to hex string
    
      return ({
        status: 'successful',
        hash: hashHex
      });
    } catch {
      return ({
        status: 'error',
        errorMessage: 'something went wrong on the hash digestion!',
        hash: null
      });
    }
  };

  logDescriptions = async _ => {
    const hashObj = await this.generateWebrtcHash();
    const descriptions = {
      hashObj,
      // selfSdp: this.peerConnection.currentLocalDescription.sdp,
      // remoteSdp: this.peerConnection.currentRemoteDescription.sdp,
      negotiationStarter: this.negotiationStarter,
      peerBrowser: this.peerBrowser,
      canUpdateMedia: this.canUpdateMedia()
    };
    console.log(descriptions);
    this.eventEmitter.emit('descriptionsCompleted', descriptions);
  };

  sendMessage = data => new Promise( async ( resolve, reject ) => {
    try {
      const encryptedMessage = await aesEncrypt(data, this.#sharedSecret);
      this.dataChannel.send(encryptedMessage)
      resolve('successful')
    } catch(err) {
      reject('some thing went wrong!', err);
    }
  });

  close = async _ => {
    this.socket.disconnect();
    this.peerConnection.close();
  }
}

export default WebRtc;
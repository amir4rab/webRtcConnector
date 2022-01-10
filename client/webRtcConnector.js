import { io } from 'socket.io-client';

import { rsaDecrypt, rsaEncrypt, rsaGenerateKey } from './utils/rsaMethods';

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
  #internalEvents;
  constructor({ serverUrl ,connectionEvent = null, onPeerConnection= null }){

    this.id = null;
    this.recipientId = null;
    this.initialized = null;
    this.negotiationStarter = false;

    this.peerConnection = new RTCPeerConnection(rtcConfiguration);
    this.events = {};
    this.#internalEvents = {};

    this.socket = io(serverUrl);
    this.isConnected = false;

    this.dataChannel = null;
    this.dataChannelState = 'close';

    this.remoteStream = null;

    this.selfKeyObj = null;
    this.peerPublicKey = null;
    this.doubleRatchet = null;

    this.socket.on( 'connection', ({ id }) => {
      this.id = id
      this.isConnected = true;
      if ( connectionEvent !== null ) connectionEvent(id);
      if ( typeof this.events.onConnection !== 'undefined' ) this.events.onConnection(id);
    })

    this.socket.on( 'keyExchange', async ({ messageType, data, from }) => {

      switch (messageType) {
        case 'offer': {

          this.peerPublicKey = data;
          await this.#generateKey();

          this.socket.emit('keyExchange', {
            recipientId: from,
            data: {
              data: this.selfKeyObj.publicKey,
              messageType: 'answer',
            }
          });

          break;
        }
        case 'answer': {
          this.peerPublicKey = data;
          this.#afterKeyExchange();

          break;
        }
      }
    });

    this.socket.on( 'message', async ({ messageType, data, enData = null, from }) => {

      const { cryptoText, encryptionIv, wrappedMessageKey } = JSON.parse(enData);
      const deData = await rsaDecrypt( cryptoText, encryptionIv, wrappedMessageKey, this.selfKeyObj.privateKey)
      const deDataJson = JSON.parse(deData);

      switch( messageType ){
        case 'answer': {
          if ( this.peerConnection === null ) {
            notInitWarn();
            return;
          };

          const remoteDesc = new RTCSessionDescription(deDataJson);
          await this.peerConnection.setRemoteDescription(remoteDesc);
          console.log('"Remote" description has been configured!');

          if ( typeof this.#internalEvents.afterDescription !== 'undefined' ) this.#internalEvents.afterDescription();
          this.logDescriptions();
          break;
        }
        case 'offer': {
          this.recipientId = from;
          if ( typeof this.events.onConnectionToRecipient !== 'undefined' ) this.events.onConnectionToRecipient(from);

          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(deDataJson));
          console.log('"Remote" description has been configured!');

          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('"Local" description has been configured!');
          this.logDescriptions();

          console.log(JSON.stringify(answer));
          const enAnswer = await rsaEncrypt(JSON.stringify(answer), this.peerPublicKey)

          this.socket.emit('message', {
            recipientId: from,
            data: {
              messageType: 'answer',
              enData: JSON.stringify(enAnswer)
            }
          })
          break;
        }
        case 'new-ice-candidate': {
          if ( this.peerConnection === null ) {
            notInitWarn();
            return;
          };
          try {
            await this.peerConnection.addIceCandidate(deDataJson);
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
        const enData = await rsaEncrypt(JSON.stringify(event.candidate), this.peerPublicKey);

        if( this.recipientId !== null ) this.socket.emit('message', {
          recipientId: this.recipientId,
          data: {
            messageType: 'new-ice-candidate',
            enData: JSON.stringify(enData)
          }
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
        if ( typeof this.events.onClose !== 'undefined' ) this.events.onClose();
      } else if ( this.peerConnection.iceConnectionState === 'failed' ) { //** gets called when something went wrong **//
        console.error('Something went wrong!')
        if ( typeof this.events.onError !== 'undefined' ) this.events.onError();
      };
    }, false);

    //** Connection Events **// 
    this.peerConnection.addEventListener( 'datachannel', event => {
      this.dataChannel = event.channel;

      this.dataChannel.onopen = this.#onDataChannelOpenEvent;

      this.dataChannel.onclose = _ => this.dataChannelState = 'close';
    }, false);
    this.peerConnection.addEventListener( 'track', async (event) => {
      const [remoteStream] = event.streams;
      this.remoteStream = remoteStream;
      if( typeof this.events.onStream !== 'undefined' ) this.events.onStream(remoteStream);
    }, false);
    
  };

  #generateKey = async _ => {
    this.selfKeyObj = await rsaGenerateKey();
  };

  #afterKeyExchange = async _ => {
    if ( typeof this.#internalEvents.afterKeyExchange !== 'undefined' ) this.#internalEvents.afterKeyExchange();
  };

  on = (event, eventHandler) => {
    this.events[event] = eventHandler;
  };

  #connect = async ( peerId ) => {
    if ( !this.isConnected ) {
      throw Error(`socket isn't connected to the server!`);
    }
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('"Local" description has been configured!');
    console.log(`local description: `, offer);

    const enData = await rsaEncrypt(JSON.stringify(offer), this.peerPublicKey);

    this.negotiationStarter = true;
    this.socket.emit('message', {
      recipientId: peerId,
      data: {
        messageType: 'offer',
        enData: JSON.stringify(enData)
      }
    })
  };

  #setupMediaConnection = ( mediaStream ) => {
    console.log(mediaStream);
    mediaStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, mediaStream);
    });
  };

  makeMediaConnection = async ( mediaStream, peerId ) => {
    await this.#generateKey();

    this.socket.emit('keyExchange', {
      recipientId: peerId,
      data: {
        messageType: 'offer',
        data: this.selfKeyObj.publicKey,
      }
    })

    this.#internalEvents.afterKeyExchange = async () => {
      this.#setupMediaConnection(mediaStream);
      this.#connect(peerId);
    }
  };

  answerMediaConnection = async ( mediaStream ) => {
    this.#setupMediaConnection(mediaStream);
  };

  #onDataChannelOpenEvent = async () => {
    this.dataChannelState = 'open'
    if ( typeof this.events.onDataChannel !== 'undefined' ) this.events.onDataChannel(this.dataChannel);
    if ( typeof this.events.onMessage !== 'undefined' ) {
      this.dataChannel.onmessage = async message => {
        const { cryptoText, encryptionIv, wrappedMessageKey } = JSON.parse(message.data);
        const decryptedMessage = await rsaDecrypt(
          cryptoText, 
          encryptionIv, 
          wrappedMessageKey, 
          this.selfKeyObj.privateKey
        )
        this.events.onMessage(decryptedMessage)
      };
    };
  };

  dataConnection = async ( peerId ) => {
    await this.#generateKey();

    this.socket.emit('keyExchange', {
      recipientId: peerId,
      data: {
        messageType: 'offer',
        data: this.selfKeyObj.publicKey,
      }
    
    })

    this.#internalEvents.afterKeyExchange = async () => {
      this.dataChannel = this.peerConnection.createDataChannel('messageDataChannel');
      console.log(`Data channel has been created!`);
  
      this.dataChannel.onopen = this.#onDataChannelOpenEvent;
  
      this.dataChannel.onclose = _ => this.dataChannelState = 'close';
      await this.#connect(peerId);
    }
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
      selfSdp: this.peerConnection.currentLocalDescription.sdp,
      remoteSdp: this.peerConnection.currentRemoteDescription.sdp,
      negotiationStarter: this.negotiationStarter
    };
    if ( typeof this.events.descriptionsCompleted !== 'undefined' ) this.events.descriptionsCompleted(descriptions)
  };

  logDetails = async _ => {
    console.log(this.peerConnection.RTCCertificate)
  };

  sendMessage = data => new Promise( async ( resolve, reject ) => {
    try {
      const encryptedMessage = await rsaEncrypt(data, this.peerPublicKey);
      this.dataChannel.send(JSON.stringify(encryptedMessage))
      resolve('successful')
    } catch(err) {
      reject('some thing went wrong!', err);
    }
  });
}

export default WebRtc;
import { io } from 'socket.io-client';

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

    this.socket.on('connection', ({ id }) => {
      this.id = id
      this.isConnected = true;
      if ( connectionEvent !== null ) connectionEvent(id);
      if ( typeof this.events.onConnection !== 'undefined' ) this.events.onConnection(id);
    })

    this.socket.on('message', async ({ messageType, data, from }) => {
      switch( messageType ){
        case 'answer': {
          if ( this.peerConnection === null ) {
            notInitWarn();
            return;
          };

          const remoteDesc = new RTCSessionDescription(data);
          await this.peerConnection.setRemoteDescription(remoteDesc);
          console.log('"Remote" description has been configured!');
          // console.log(`remote description: `, data);

          if ( typeof this.#internalEvents.afterDescription !== 'undefined' ) this.#internalEvents.afterDescription();
          this.logDescriptions();
          break;
        }
        case 'offer': {
          this.recipientId = from;
          if ( typeof this.events.onConnectionToRecipient !== 'undefined' ) this.events.onConnectionToRecipient(from);

          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          console.log('"Remote" description has been configured!');
          // console.log(`remote description: `, data);

          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          console.log('"Local" description has been configured!');
          this.logDescriptions();

          this.socket.emit('message', {
            recipientId: from,
            data: {
              messageType: 'answer',
              data: answer
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
            await this.peerConnection.addIceCandidate(data);
          } catch(e) {
            console.error('Error adding received ice candidate', e);
          }
          break;
        }
      }
    });

    //** Ice Candidates Event **// 
    this.peerConnection.onicecandidate = (event) => {
      // console.warn(`Ice connection state: ${this.peerConnection.iceConnectionState}`)
      if ( event.candidate ) {
        // console.log(event.candidate)
        if( this.recipientId !== null ) this.socket.emit('message', {
          recipientId: this.recipientId,
          data: {
            messageType: 'new-ice-candidate',
            data: event.candidate
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
      this.dataChannel.onopen = _ => {
        this.dataChannelState = 'open';
        if ( typeof this.events.onDataChannel !== 'undefined' ) this.events.onDataChannel(this.dataChannel);
      };
      this.dataChannel.onclose = _ => this.dataChannelState = 'close';
    }, false);
    this.peerConnection.addEventListener( 'track', async (event) => {
      const [remoteStream] = event.streams;
      this.remoteStream = remoteStream;
      if( typeof this.events.onStream !== 'undefined' ) this.events.onStream(remoteStream);
    }, false);
    
  }

  on = (event, eventHandler) => {
    this.events[event] = eventHandler;
  }

  #connect = async ( peerId ) => {
    if ( !this.isConnected ) {
      throw Error(`socket isn't connected to the server!`);
    }
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('"Local" description has been configured!');
    console.log(`local description: `, offer);

    this.negotiationStarter = true;
    this.socket.emit('message', {
      recipientId: peerId,
      data: {
        messageType: 'offer',
        data: offer
      }
    })
  };

  #setupMediaConnection = ( mediaStream ) => {
    console.log(mediaStream);
    mediaStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, mediaStream);
    });
  }

  makeMediaConnection = async ( mediaStream, peerId ) => {
    this.#setupMediaConnection(mediaStream);
    this.#connect(peerId);
  }

  answerMediaConnection = async ( mediaStream ) => {
    this.#setupMediaConnection(mediaStream);
  }

  dataConnection = async ( peerId ) => {
    this.dataChannel = this.peerConnection.createDataChannel('messageDataChannel');
    console.log(`Data channel has been created!`)
    this.dataChannel.onopen = _ => {
      this.dataChannelState = 'open'
      this.dataChannel.send('hello world from 1');
      if ( typeof this.events.onDataChannel !== 'undefined' ) this.events.onDataChannel(this.dataChannel);
    };
    this.dataChannel.onclose = _ => this.dataChannelState = 'close';
    await this.#connect(peerId);
  }

  generateWebrtcHash = async ( hashMethod= 'SHA-256' ) => {
    // console.log(this.peerConnection.currentLocalDescription.sdp , this.peerConnection.currentRemoteDescription.sdp)
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
    
      const text = this.negotiationStarter ? `${selfFingerPrint}${remoteFingerPrint}` : `${remoteFingerPrint}${selfFingerPrint}`;
    
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
  }
}

export default WebRtc;
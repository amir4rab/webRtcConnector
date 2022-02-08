import WebRtc from '../../lib/webRtcConnector';
import adapter from 'webrtc-adapter';

console.log(adapter);

document.getElementById('reloadButton')!.addEventListener('click', () => location.reload());
const displayReloadPage = () => {
  document.getElementById('activePage')?.setAttribute('style', 'display: none');
  document.getElementById('reloadPage')?.setAttribute('style', 'display: block');
};

const displayAfterConnectionControls = () => {
  document.getElementById('afterConnectionBox')?.setAttribute('style','display: block');
}


//** global query selectors **// 
const selfId = document.getElementById('selfId') as HTMLInputElement;
const selfSecret = document.getElementById('selfSecret') as HTMLInputElement;
const peerId = document.getElementById('peerId') as HTMLInputElement;
const peerSecret = document.getElementById('peerSecret') as HTMLInputElement;

//** Datachannel query selectors **// 
const inBox = document.getElementById('inBox') as HTMLInputElement;
const messageInput = document.getElementById('messageInput') as HTMLInputElement;
const dataChanelBox = document.getElementById('dataChanelBox') as HTMLInputElement;
const recipientInputsBox = document.getElementById('recipientInputsBox') as HTMLInputElement;

//** Media stream query selectors **// 
const streamsBox = document.getElementById('streamsBox') as HTMLElement;
const selfVideo = document.getElementById('selfVideo') as HTMLVideoElement;
selfVideo.onloadeddata = () => {
  selfVideo.play();
};
const peerVideo = document.getElementById('peerVideo') as HTMLVideoElement;
peerVideo.onloadeddata = () => {
  peerVideo.play();
};

let dataChannelRef: RTCDataChannel;

const webRtc = new WebRtc({ serverUrl: 'http://localhost:5001/', connectionEvent: null, onPeerConnection: null });

webRtc.on( "onConnection", ( data ) => {
  console.log(data)
  selfId.value = data.id;
  selfSecret.value = data.secret;
});

webRtc.on('onDataChannel', dataChannel => {
  console.log('DataChannel has been received!')
  dataChanelBox.setAttribute( 'style', `display: block` );
  recipientInputsBox.setAttribute( 'style', 'display: none' );
  dataChannelRef = dataChannel;
});

webRtc.on('onStream', remoteStream => {
  console.log('Remote stream has been received!');
  peerVideo.srcObject = remoteStream;
});

webRtc.on('descriptionsCompleted', async ({ hashObj }) => {
  displayAfterConnectionControls();
  console.log(hashObj.hash)
});

webRtc.on('onMessage', data => {
  inBox.value = data
});

webRtc.on('onClose', () => {
  displayReloadPage();
});

webRtc.on('onError', () => {
  displayReloadPage();
})

//** Datachannel Managements **//

const startDataChannel = () => {
  console.log({ id: peerId.value, secret: peerSecret.value})
  webRtc.dataConnection({ id: peerId.value, secret: peerSecret.value});
  peerId.value= '';
  peerSecret.value= '';
};
document.getElementById('makeDataChannel')!.addEventListener('click', startDataChannel);

const sendMessageEvent = () => {
  webRtc.sendMessage(messageInput.value);
  messageInput.value = '';
};
document.getElementById('sendMessage')!.addEventListener('click', sendMessageEvent);


//** Media Managements **//

let mediaStreamRef: MediaStream | null = null;
const stopCurrentTracks = async () => {
  if ( mediaStreamRef === null ) return;
  const streams = mediaStreamRef.getTracks();
  streams.forEach(track => track.stop());
  mediaStreamRef = null;
}

const getAudioMedia = async () => { //** only audio track **//
  await stopCurrentTracks();

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    selfVideo.srcObject = stream;
    selfVideo.onloadeddata = () => {
      selfVideo.play();
    };
  } catch {
    console.error('error in fetching audio');
  }
  mediaStreamRef = stream;
  return stream;
}

const getAllMedia = async ( disabledByDefault = false ) => { //** camera and audio tracks **//
  await stopCurrentTracks();

  let stream = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if ( disabledByDefault ) {
      stream.getTracks().forEach(track => {
        track.enabled = false;
      })
    };
    selfVideo.srcObject = stream;
    selfVideo.onloadeddata = () => {
      selfVideo.play();
    };
  } catch {
    console.error('error in fetching audio');
  }
  mediaStreamRef = stream;
  return stream;
}

const getDisplayMedia = async () => { //** screen cast track **//
  await stopCurrentTracks();

  let stream = null
  try {
    stream = await navigator.mediaDevices.getDisplayMedia();
    selfVideo.srcObject = stream;
    selfVideo.onloadeddata = () => {
      selfVideo.play();
    };
  } catch {
    console.error('error in fetching audio');
  }
  mediaStreamRef = stream;
  return stream;
}

const answerCall = async () => {
  await getAudioMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  console.log(mediaStreamRef);
  await webRtc.answerMediaConnection(mediaStreamRef);
  streamsBox.setAttribute( 'style', 'display: block');
};
document.getElementById('answerCall')!.addEventListener('click', answerCall);


const makeCall = async () => {
  await getAudioMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.makeMediaConnection(mediaStreamRef, { id: peerId.value, secret: peerSecret.value });
  peerId.value= '';
  peerSecret.value= '';
  streamsBox.setAttribute( 'style', 'display: block' );
}
document.getElementById('makeCall')!.addEventListener('click', makeCall);

const audioOnly = async () => {
  await getAudioMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
}
document.getElementById('audioOnly')!.addEventListener('click', audioOnly);

const displayOn = async () => {
  await getDisplayMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
}
document.getElementById('displayOn')!.addEventListener('click', displayOn);


const cameraOn = async () => {
  await getAllMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
  // await webRtc.updateMedia();
}
document.getElementById('cameraOn')!.addEventListener('click', cameraOn);

document.getElementById('logDescriptions')!.addEventListener('click', webRtc.logDescriptions);

document.getElementById('closeConnection')!.addEventListener('click', async () => {
  await webRtc.close();
  displayReloadPage();
})
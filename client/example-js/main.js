import WebRtc from '../lib/webRtcConnector';
import adapter from 'webrtc-adapter';

console.log(adapter);

document.getElementById('reloadButton').addEventListener('click', _ => location.reload());
const displayReloadPage = _ => {
  document.getElementById('activePage').style='display: none';
  document.getElementById('reloadPage').style='display: block';
};

const displayAfterConnectionControls = _ => {
  document.getElementById('afterConnectionBox').style = 'display: block'
}


//** global query selectors **// 
const selfId = document.getElementById('selfId');
const selfSecret = document.getElementById('selfSecret');
const peerId = document.getElementById('peerId');
const peerSecret = document.getElementById('peerSecret');

//** Datachannel query selectors **// 
const inBox = document.getElementById('inBox');
const messageInput = document.getElementById('messageInput');
const dataChanelBox = document.getElementById('dataChanelBox');
const recipientInputsBox = document.getElementById('recipientInputsBox');

//** Media stream query selectors **// 
const streamsBox = document.getElementById('streamsBox');
const selfVideo = document.getElementById('selfVideo');
selfVideo.onloadeddata = _ => {
  selfVideo.play();
};
const peerVideo = document.getElementById('peerVideo');
peerVideo.onloadeddata = _ => {
  peerVideo.play();
};

let dataChannelRef;

const webRtc = new WebRtc({ serverUrl: 'http://localhost:5001' });

webRtc.on( "onConnection", data => {
  console.log(data)
  selfId.value = data.id;
  selfSecret.value = data.secret;
});

webRtc.on('onDataChannel', dataChannel => {
  console.log('DataChannel has been received!')
  dataChanelBox.style = `display: block`;
  recipientInputsBox.style = 'display: none';
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

webRtc.on('onClose', _ => {
  displayReloadPage();
});

webRtc.on('onError', _ => {
  displayReloadPage();
})

//** Datachannel Managements **//

const startDataChannel = _ => {
  console.log({ id: peerId.value, secret: peerSecret.value})
  webRtc.dataConnection({ id: peerId.value, secret: peerSecret.value});
  peerId.value= '';
  peerSecret.value= '';
};
document.getElementById('makeDataChannel').addEventListener('click', startDataChannel);

const sendMessageEvent = () => {
  webRtc.sendMessage(messageInput.value);
  messageInput.value = '';
};
document.getElementById('sendMessage').addEventListener('click', sendMessageEvent);


//** Media Managements **//

let mediaStreamRef = null;
const stopCurrentTracks = async () => {
  if ( mediaStreamRef === null ) return;
  const streams = await mediaStreamRef.getTracks();
  streams.forEach(track => track.stop());
  mediaStreamRef = null;
}

const getAudioMedia = async () => { //** only audio track **//
  await stopCurrentTracks();

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    selfVideo.srcObjet = stream;
    selfVideo.onloadeddata = _ => {
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
    selfVideo.srcObjet = stream;
    selfVideo.onloadeddata = _ => {
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
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } });
    selfVideo.srcObjet = stream;
    selfVideo.onloadeddata = _ => {
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
  streamsBox.style = 'display: block';
};
document.getElementById('answerCall').addEventListener('click', answerCall);


const makeCall = async () => {
  await getAudioMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.makeMediaConnection(mediaStreamRef, { id: peerId.value, secret: peerSecret.value });
  peerId.value= '';
  peerSecret.value= '';
  streamsBox.style = 'display: block';
}
document.getElementById('makeCall').addEventListener('click', makeCall);

const audioOnly = async () => {
  await getAudioMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
}
document.getElementById('audioOnly').addEventListener('click', audioOnly);

const displayOn = async () => {
  await getDisplayMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
}
document.getElementById('displayOn').addEventListener('click', displayOn);


const cameraOn = async () => {
  await getAllMedia();
  if( mediaStreamRef === null ){
    console.error('No Media');
    return;
  }
  await webRtc.updateMedia(mediaStreamRef);
  // await webRtc.updateMedia();
}
document.getElementById('cameraOn').addEventListener('click', cameraOn);

document.getElementById('logDescriptions').addEventListener('click', webRtc.logDescriptions);

document.getElementById('closeConnection').addEventListener('click', async _ => {
  await webRtc.close();
  displayReloadPage();
})
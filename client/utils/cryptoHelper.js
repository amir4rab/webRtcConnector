export const fileSlicer = async (fileRef) => {
  const chunksArr = [];
  const chunkSize = 64000;
  let offset = 0;
  const file = await fileLoaderPromise(fileRef);
  const chunks = Math.ceil(file.length / chunkSize);
  for ( let i = 0 ; i < chunks ; i++ ) {
    const blob = file.slice(offset, offset + chunkSize);
    chunksArr.push(blob);
    offset = offset + chunkSize;
  }
  return {
    data: chunksArr,
    chunks
  };
};

export const stringSlicer = (string) => {
  const chunksArr = [];
  const chunkSize = 64000;
  let offset = 0;
  const chunks = Math.ceil(string.length / chunkSize);
  for ( let i = 0 ; i < chunks ; i++ ) {
    const blob = string.slice(offset, offset + chunkSize);
    chunksArr.push(blob);
    offset = offset + chunkSize;
  }
  return {
    data: chunksArr,
    chunks
  };
};

export const chunkUnifier = (chunksArr) => chunksArr.join('');

export const str2ab = (str) => {
  // if ( str === null ) return new Uint8Array(0)
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

export const ab2str = (buf) => {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
};

export const removePemPadding = (keyDER) => {
  if( keyDER.includes('PUBLIC') ) {
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = keyDER.substring(pemHeader.length, keyDER.length - pemFooter.length);
    return pemContents
  } 
  if ( keyDER.includes('PRIVATE') ) {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = keyDER.substring(pemHeader.length, keyDER.length - pemFooter.length);
    return pemContents;
  }
  return keyDER;
};
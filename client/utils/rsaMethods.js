import { ab2str, str2ab, removePemPadding } from './cryptoHelper';

export const rsaEncrypt = async ( message, encKeyDER ) => {
  const textEncoder = new TextEncoder();

  const messageKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    [ 'encrypt' ]
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cryptoText = await window.crypto.subtle.encrypt( //** our wrapped message **//
    { name: 'AES-GCM', iv },
    messageKey,
    textEncoder.encode(message)
  )
  const cryptoTextStr = ab2str(cryptoText);
  
  const pemContents = removePemPadding(encKeyDER);
  const binaryDerString = window.atob(pemContents);
  const binaryDer = str2ab(binaryDerString);
  const wrappingKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    [ 'wrapKey' ]
  );

  const wrappedMessageKey = await crypto.subtle.wrapKey( //** decryption key for encrypted message **//
    "raw",
    messageKey,
    wrappingKey,
    { name: "RSA-OAEP" }
  )
  const wrappedMessageKeyStr = ab2str(wrappedMessageKey);
  return {
    wrappedMessageKey: wrappedMessageKeyStr,
    encryptionIv: ab2str(iv),
    cryptoText: cryptoTextStr,
  };
};

export const rsaEncryptArr = async ( file, encKeyDER ) => {
  console.log(file);
  const encryptedArr = [];
  for ( let i = 0 ; i < file.chunks ; i++ ) {
    const encryptedChunk = await rsaEncrypt( file.data[i], encKeyDER );
    encryptedArr.push(encryptedChunk);
  }
  return encryptedArr;
}

export const rsaDecrypt = async ( cryptoText, encryptionIv, wrappedMessageKey, decKeyDER ) => {

  const textDecoder = new TextDecoder(); // generating text encoder
  const pemContents = removePemPadding(decKeyDER); // removing padding
  const binaryDerString = window.atob(pemContents); // decoding base64
  const binaryDer = str2ab(binaryDerString); // converging string to arraybuffer
  const unwrappingKey = await crypto.subtle.importKey( // generating unwrapping key
    'pkcs8',
    binaryDer, // recipient's private RSA key
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    [ 'unwrapKey' ]
  );

  const unwrappedMessageKey = await crypto.subtle.unwrapKey( // generating message key un-wrapper
    'raw',
    str2ab(wrappedMessageKey),
    unwrappingKey,
    { name: 'RSA-OAEP' },
    { name: "AES-GCM" },
    false, // no need for extractable,
    [ 'decrypt' ]
  );

  const cryptoTextAb = str2ab(cryptoText)
  const receivedMessage = await crypto.subtle.decrypt( // decrypting received message
    { name: 'AES-GCM', iv: str2ab(encryptionIv) },
    unwrappedMessageKey,
    cryptoTextAb
  );
  return textDecoder.decode(receivedMessage)
};

export const rsaDecryptArr = async ( encryptedFile , decKeyDER ) => {
  const decryptedArr = [];
  for ( let i = 0 ; i < encryptedFile.length ; i++ ) {
    const encryptedChunk = await rsaDecrypt( 
      str2ab(encryptedFile[i].cryptoText), 
      encryptedFile[i].encryptionIv, 
      str2ab(encryptedFile[i].wrappedMessageKey), 
      decKeyDER 
    );
    decryptedArr.push(encryptedChunk);
  }
  return decryptedArr;
}

export const rsaGenerateKey = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey,
  )
  const exportedAsString = ab2str(publicKey);
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExportedPublicKey = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;

  const privateKey = await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey,
  )
  const exportedPrivateKeyAsString = ab2str(privateKey);
  const exportedPrivateKeyAsBase64 = window.btoa(exportedPrivateKeyAsString);
  const pemExportedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${exportedPrivateKeyAsBase64}\n-----END PRIVATE KEY-----`;
  
  return ({
    publicKey: pemExportedPublicKey,
    publicKeyFormat: 'spki',
    privateKey: pemExportedPrivateKey,
    privateKeyFormat: 'pkcs8'
  })
};

export const rsaSing = async ( data, singingKeyDER ) => {
  const pemContents = removePemPadding(singingKeyDER); // removing padding
  const binaryDerString = window.atob(pemContents); // decoding base64
  const binaryDer = str2ab(binaryDerString); // converging string to arraybuffer
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer, // sender's private key
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    [ 'sign' ]
  );
  // const dataToSing = textEncoder.encode(data);
  const textSignature = await crypto.subtle.sign(
    { name: 'RSA-PSS', saltLength: 32 },
    signingKey,
    str2ab(data),
  )
  return ab2str(textSignature);
};

export const rsaVerify = async ( signedData, data, verifyingKeyDER ) => {
  const pemContents = removePemPadding(verifyingKeyDER); // removing padding
  const binaryDerString = window.atob(pemContents); // decoding base64 
  const binaryDer = str2ab(binaryDerString); // converging string to arraybuffer
  const verifyKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    [ 'verify' ]
  );
  const isLegitimate = await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    verifyKey,
    str2ab(signedData),
    str2ab(data),
  )
  return isLegitimate;
};
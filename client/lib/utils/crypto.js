"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecdhSecretKey = exports.ecdhGenerateKey = exports.aesDecrypt = exports.aesEncrypt = exports.aesKeyGenerate = exports.ab2str = exports.str2ab = void 0;
const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};
exports.str2ab = str2ab;
const ab2str = (buf) => {
    return String.fromCharCode.apply(null, [...new Uint8Array(buf)]);
};
exports.ab2str = ab2str;
const aesKeyGenerate = async () => {
    const keyPair = await crypto.subtle.generateKey({
        name: "AES-GCM",
        length: 256
    }, true, ["encrypt", "decrypt"]);
    const key = await crypto.subtle.exportKey('raw', keyPair);
    return ({
        key: (0, exports.ab2str)(key),
        keyFormat: 'raw',
    });
};
exports.aesKeyGenerate = aesKeyGenerate;
const aesEncrypt = async (data, secretKey) => {
    const inputData = typeof data === 'object' ? JSON.stringify(data) : data;
    const textEncoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const secretKeyString = window.atob(secretKey); // decoding base64
    const key = await crypto.subtle.importKey('raw', (0, exports.str2ab)(secretKeyString), 'AES-GCM', false, ['encrypt']);
    const encryptedData = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv
    }, key, textEncoder.encode(inputData));
    const encryptedDataAsString = (0, exports.ab2str)(encryptedData);
    const encryptedDataAsBase64 = window.btoa(encryptedDataAsString);
    const ivAsString = (0, exports.ab2str)(iv);
    const ivAsBase64 = window.btoa(ivAsString);
    const result = JSON.stringify({
        encryptionIv: ivAsBase64,
        encryptedData: encryptedDataAsBase64,
    });
    return result;
};
exports.aesEncrypt = aesEncrypt;
const aesDecrypt = async (encryptedDataString, secretKey) => {
    const { encryptionIv, encryptedData } = JSON.parse(encryptedDataString);
    const textDecoder = new TextDecoder();
    const ivStr = window.atob(encryptionIv);
    const ivAb = (0, exports.str2ab)(ivStr);
    const encryptedDataStr = window.atob(encryptedData);
    const encryptedDataAb = (0, exports.str2ab)(encryptedDataStr);
    const secretKeyString = window.atob(secretKey); // decoding base64
    const key = await crypto.subtle.importKey('raw', (0, exports.str2ab)(secretKeyString), 'AES-GCM', false, ['decrypt']);
    const decryptedData = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv: ivAb
    }, key, encryptedDataAb);
    return textDecoder.decode(decryptedData);
};
exports.aesDecrypt = aesDecrypt;
const ecdhGenerateKey = async () => {
    const keyPair = await crypto.subtle.generateKey({
        name: "ECDH",
        namedCurve: "P-384"
    }, true, ['deriveKey']);
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const exportedAsString = (0, exports.ab2str)(publicKey);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const exportedPrivateKeyAsString = (0, exports.ab2str)(privateKey);
    const exportedPrivateKeyAsBase64 = window.btoa(exportedPrivateKeyAsString);
    return ({
        publicKey: exportedAsBase64,
        publicKeyFormat: 'spki',
        privateKey: exportedPrivateKeyAsBase64,
        privateKeyFormat: 'pkcs8'
    });
};
exports.ecdhGenerateKey = ecdhGenerateKey;
const ecdhSecretKey = async (privateKey, publicKey) => {
    const binaryPrivateKey = window.atob(privateKey);
    const privateKeyObj = await crypto.subtle.importKey('pkcs8', (0, exports.str2ab)(binaryPrivateKey), {
        name: 'ECDH',
        namedCurve: "P-384"
    }, false, ['deriveKey']);
    const binaryPublicKey = window.atob(publicKey);
    const publicKeyObj = await crypto.subtle.importKey('spki', (0, exports.str2ab)(binaryPublicKey), {
        name: 'ECDH',
        namedCurve: "P-384"
    }, false, []);
    const secretKey = await crypto.subtle.deriveKey({
        name: 'ECDH',
        public: publicKeyObj
    }, privateKeyObj, {
        name: "AES-GCM",
        length: 256
    }, true, ["encrypt", "decrypt"]);
    const exportedSecretKey = await crypto.subtle.exportKey('raw', secretKey);
    const exportedPrivateKeyAsString = (0, exports.ab2str)(exportedSecretKey);
    const exportedPrivateKeyAsBase64 = window.btoa(exportedPrivateKeyAsString);
    return exportedPrivateKeyAsBase64;
};
exports.ecdhSecretKey = ecdhSecretKey;

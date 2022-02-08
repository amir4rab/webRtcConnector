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

interface ServerToClientEvents {
    keyExchange: () => {
        recipientId: string;
        data: string;
    };
    message: () => {
        recipientId: string;
        data: string;
    };
}
interface ClientToServerEvents {
    keyExchange: (recipientId: string, data: string) => void;
    message: (recipientId: string, encryptedData: string) => void;
}

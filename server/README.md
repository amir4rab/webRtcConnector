# WebRtcConnector Server

### <p class="warning">Waring: This project hasn't been audited by security researchers, therefore please don't use it in Production environment<p>


WebRtcConnector Signaling server is, a [socket.io](https://socket.io) server, modify it for your use case.

### Setup
#### cloning
```bash
git clone https://github.com/amir4rab/webRtcConnector && cd ./server
```
#### installing dependencies
```bash
npm install
```
#### making environment variables
make .env file and add these two variables to it
```
PORT: 'Port for your signaling server'
ORIGIN: 'Origin of your webapp'
```



## Learn more

- [socket.io](https://socket.io) 
- [WebRtcConnectorClient](../client/README.md) 
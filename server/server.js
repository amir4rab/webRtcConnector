require('dotenv').config();

const { createServer } = require("http");
const { Server } = require('socket.io');

const { v4: uuidv4, validate: validateUuidv4 } = require('uuid');
const getSocketId = require('./utils/getSocketId');
const verifyInput = require('./utils/verifyInput');

const httpServer = createServer();
const io = new Server( httpServer, {  
  cors: {    
    origin: process.env.ORIGIN || 3000,   
    methods: ["GET", "POST"]  
  }
});

const activeUsers = new Map();
console.log(`Sockets.io server is live at http://localhost:${ process.env.PORT || 5000 }`);


io.on('connection', async socket => { 
  const userId = uuidv4();
  try {
    activeUsers.set(socket.id, userId);
  } catch {
    console.log('disconnected');
    socket.disconnect(true);
    return;
  };
  console.log(`${ socket.id } has been connected as "${ userId }"!`);

  socket.on('disconnect', _ => {
    activeUsers.delete(socket.id); 
  });

  socket.emit('connection', { id: userId })

  socket.on('message', ( message, callback ) => {
    if ( !verifyInput(message.encryptedData) || !validateUuidv4(message.recipientId) )  {
      console.log('False inputs');
      callback && callback({ status: 'failed', reason: 'false input' });
    } else {
      const recipientSocketId = getSocketId(message.recipientId, activeUsers);
      socket.to(recipientSocketId).emit('message', { encryptedData: message.encryptedData, from: activeUsers.get(socket.id)});
      callback && callback({ status: 'sucessful', reason: null });
    }
  })

  socket.on('keyExchange', ( message, callback ) => {
    if ( !verifyInput(message.data) || !validateUuidv4(message.recipientId) )  {
      console.log('False inputs');
      callback && callback({ status: 'failed', reason: 'false input' });
    } else {
      const recipientSocketId = getSocketId(message.recipientId, activeUsers);
      socket.to(recipientSocketId).emit('keyExchange', { data: message.data, from: activeUsers.get(socket.id)});
      callback && callback({ status: 'sucessful', reason: null });
    }
  })
});

httpServer.listen( process.env.PORT || 5000 );
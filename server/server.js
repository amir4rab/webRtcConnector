require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const getSocketId = require('./utils/getSocketId');

const io = require('socket.io')(process.env.PORT, {  
  cors: {    
    origin: "http://localhost:3000",   
    methods: ["GET", "POST"]  
  },
  allowRequest: (req, callback) => {
    callback(null, req);  
  }
});

const activeUsers = new Map();
console.log(`Sockets.io server is live at http://localhost:${process.env.PORT}`);


io.on('connection', async socket => { 
  const userId = uuidv4();
  try {
    activeUsers.set(socket.id, userId);
  } catch {
    console.log('disconnected');
    socket.disconnect(true);
    return;
  };
  console.log(`${socket.id} has been connected as "${userId}"!`);

  socket.on('disconnect', _ => {
    activeUsers.delete(socket.id);
  });

  socket.emit('connection', { id: userId })

  socket.on('message', message => {
    const recipientSocketId = getSocketId(message.recipientId, activeUsers);
    console.log(message.data.messageType);
    socket.to(recipientSocketId).emit('message', { ...message.data, from: activeUsers.get(socket.id)});
  })
});
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // userId -> socketId

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: true,
        credentials: true
      }
    });

    // Socket auth middleware
    io.use((socket, next) => {
      let token = socket.handshake.auth.token;
      if (!token && socket.handshake.headers.cookie) {
        // Fallback or read from cookies if needed
      }
      if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) return next(new Error('Authentication error'));
          socket.userId = decoded.id;
          next();
        });
      } else {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      // Map user ID to socket ID
      userSockets.set(socket.userId, socket.id);
      
      socket.on('joinChat', (conversationId) => {
        socket.join(conversationId);
      });

      socket.on('typing', ({ conversationId, isTyping }) => {
        socket.to(conversationId).emit('typing', { userId: socket.userId, isTyping });
      });

      socket.on('disconnect', () => {
        userSockets.delete(socket.userId);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  getUserSocket: (userId) => {
    return userSockets.get(userId);
  }
};

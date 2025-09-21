import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

import connectDB from './db.js'; // ✅ MongoDB connection
import InventoryChatMessage from './models/InventoryChatMessage.js'; // chat model

// ✅ Route imports
import userRoutes from './routes/userRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import createInventoryRoute from './routes/createInventoryUser.js';
import inventoryChatRoutes from './routes/inventoryChatRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// For __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ✅ Serve static files (e.g., receipts)
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// ✅ Root route
app.get('/', (req, res) => res.send('🚢 Mombasa Ferry API is running'));

// ✅ API Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/auth', createInventoryRoute);
app.use('/api/inventory/chat', inventoryChatRoutes);

// 🛑 Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// ✅ Connect to MongoDB then start server
connectDB()
  .then(() => {
    const server = http.createServer(app);

    // 🔴 Socket.io setup for supplier ↔ inventory chat
    const io = new Server(server, {
      cors: {
        origin: '*',
      },
    });

    io.on('connection', (socket) => {
      console.log('🟢 New user connected:', socket.id);

      // Join a room
      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
      });

      // Listen for messages from client
      socket.on('send_message', async (data) => {
        const { roomId, message, sender } = data;

        // Broadcast message to everyone in the room except sender
        socket.to(roomId).emit('receive_message', { message, sender, timestamp: new Date() });

        // ✅ Save the message to MongoDB
        try {
          const newMsg = new InventoryChatMessage({ roomId, message, sender });
          await newMsg.save();
        } catch (err) {
          console.error('Socket.io save message error:', err);
        }
      });

      socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server due to DB connection error:', err);
  });

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import connectDB from './config/database.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Enable Cross-Origin Resource Sharing (CORS) for SPA clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Setup JSON parsing middleware with safety limits for bulk operations
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach custom operational request log tracker
app.use(requestLogger);

// Root live health check API
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    systemTime: new Date().toISOString(),
    service: 'Billing360 Enterprise API Engine',
    version: '1.0.0-PROD'
  });
});

// Load the fully normalized REST API router
app.use('/api', apiRouter);

// Bind the production Global Error Handler Interceptor middleware
app.use(errorHandler);

// Launch server instance
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================================`);
  console.log(`⚡ Billing360 Server initialized successfully.`);
  console.log(`🌎 Target Host URL: http://0.0.0.0:${PORT}`);
  console.log(`🛠️ Active Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`===========================================================`);
});

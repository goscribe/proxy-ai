const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize AI clients
const cohere = require('cohere-ai');

// Configure Cohere
cohere.init(process.env.COHERE_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins for development
    // In production, you should specify allowed origins
    callback(null, true);
    
    // Example for production:
    // const allowedOrigins = ['http://localhost:3000', 'https://yourdomain.com'];
    // if (allowedOrigins.indexOf(origin) !== -1) {
    //   callback(null, true);
    // } else {
    //   callback(new Error('Not allowed by CORS'));
    // }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Proxy AI Inference Server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      cohere: process.env.COHERE_API_KEY ? 'configured' : 'not configured'
    }
  });
});

// Example API route
app.post('/api/data', (req, res) => {
  const { data } = req.body;
  res.json({ 
    message: 'Data received successfully',
    receivedData: data,
    timestamp: new Date().toISOString()
  });
});

// Cohere Inference Route
app.post('/api/cohere/inference', async (req, res) => {
  try {
    const { prompt, model = 'command', max_tokens = 150, temperature = 0.7 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.COHERE_API_KEY) {
      return res.status(500).json({ error: 'Cohere API key not configured' });
    }

    const response = await cohere.generate({
      model: model,
      prompt: prompt,
      max_tokens: max_tokens,
      temperature: temperature,
      k: 0,
      stop_sequences: [],
      return_likelihoods: 'NONE'
    });

    res.json({
      success: true,
      response: response.body.generations[0].text,
      model: model,
      usage: {
        prompt_tokens: response.body.meta?.billed_units?.input_tokens,
        completion_tokens: response.body.meta?.billed_units?.output_tokens,
        total_tokens: response.body.meta?.billed_units?.total_tokens
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cohere Error:', error);
    res.status(500).json({
      error: 'Cohere inference failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AI Models Info Route
app.get('/api/models', (req, res) => {
  res.json({
    cohere: {
      models: ['command', 'command-light', 'command-nightly', 'command-light-nightly'],
      endpoint: '/api/cohere/inference',
      description: 'Cohere Command models for text generation'
    },
    timestamp: new Date().toISOString()
  });
});

// API Documentation Route
app.get('/api/docs', (req, res) => {
  res.json({
    endpoints: {
      'GET /': 'Server status and version info',
      'GET /api/health': 'Health check with service status',
      'GET /api/models': 'Available AI models information',
      'GET /api/docs': 'This API documentation',
      'POST /api/data': 'Example endpoint that accepts JSON data',
      'POST /api/cohere/inference': 'Cohere AI text generation'
    },
    examples: {
      'cohere_inference': {
        method: 'POST',
        url: '/api/cohere/inference',
        body: {
          prompt: 'Write a short story about a robot',
          model: 'command',
          max_tokens: 150,
          temperature: 0.7
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/models',
      'GET /api/docs',
      'POST /api/data',
      'POST /api/cohere/inference'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Proxy AI Inference Server is running on port ${PORT}`);
  console.log(`📡 CORS is enabled for all origins`);
  console.log(`🌐 Access your server at: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log(`🤖 Cohere models: http://localhost:${PORT}/api/models`);
});

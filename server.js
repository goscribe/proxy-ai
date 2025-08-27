const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize AI clients
const cohere = require('cohere-ai');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

// Configure Cohere
cohere.init(process.env.COHERE_API_KEY);

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY ? {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  } : undefined,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || process.env.GCP_KEY_FILE,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx|xls|xlsx|csv|zip|rar/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

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
      cohere: process.env.COHERE_API_KEY ? 'configured' : 'not configured',
      gcs: process.env.GOOGLE_CLOUD_BUCKET_NAME ? 'configured' : 'not configured'
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

// Google Cloud Storage Proxy Routes

// Upload file to GCS
app.post('/api/gcs/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return res.status(500).json({ error: 'Google Cloud Storage bucket not configured' });
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const fileExtension = originalName.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    const file = bucket.file(fileName);
    
    // Upload file
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: originalName,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Generate signed URL for secure access
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      fileName: fileName,
      originalName: originalName,
      size: req.file.size,
      mimeType: req.file.mimetype,
      signedUrl: signedUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GCS Upload Error:', error);
    res.status(500).json({
      error: 'File upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Download file from GCS
app.get('/api/gcs/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return res.status(500).json({ error: 'Google Cloud Storage bucket not configured' });
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate signed URL for download
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    res.json({
      success: true,
      fileName: fileName,
      downloadUrl: signedUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GCS Download Error:', error);
    res.status(500).json({
      error: 'File download failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List files in GCS bucket
app.get('/api/gcs/files', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return res.status(500).json({ error: 'Google Cloud Storage bucket not configured' });
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    
    const [files] = await bucket.getFiles();
    
    const fileList = files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      timeCreated: file.metadata.timeCreated,
      updated: file.metadata.updated,
      originalName: file.metadata.metadata?.originalName || file.name
    }));

    res.json({
      success: true,
      files: fileList,
      count: fileList.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GCS List Files Error:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Delete file from GCS
app.delete('/api/gcs/files/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return res.status(500).json({ error: 'Google Cloud Storage bucket not configured' });
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file
    await file.delete();

    res.json({
      success: true,
      message: 'File deleted successfully',
      fileName: fileName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GCS Delete Error:', error);
    res.status(500).json({
      error: 'File deletion failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get file metadata
app.get('/api/gcs/files/:fileName/metadata', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      return res.status(500).json({ error: 'Google Cloud Storage bucket not configured' });
    }

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Get file metadata
    const [metadata] = await file.getMetadata();

    res.json({
      success: true,
      fileName: fileName,
      metadata: {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        originalName: metadata.metadata?.originalName || metadata.name,
        customMetadata: metadata.metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GCS Metadata Error:', error);
    res.status(500).json({
      error: 'Failed to get file metadata',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
      'POST /api/cohere/inference': 'Cohere AI text generation',
      'POST /api/gcs/upload': 'Upload file to Google Cloud Storage',
      'GET /api/gcs/download/:fileName': 'Get signed URL for file download',
      'GET /api/gcs/files': 'List all files in GCS bucket',
      'DELETE /api/gcs/files/:fileName': 'Delete file from GCS bucket',
      'GET /api/gcs/files/:fileName/metadata': 'Get file metadata'
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
      },
      'gcs_upload': {
        method: 'POST',
        url: '/api/gcs/upload',
        body: 'multipart/form-data with file field',
        description: 'Upload file to GCS with secure signed URL'
      },
      'gcs_download': {
        method: 'GET',
        url: '/api/gcs/download/1234567890-abc123.jpg',
        description: 'Get secure download URL for file'
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
      'POST /api/cohere/inference',
      'POST /api/gcs/upload',
      'GET /api/gcs/download/:fileName',
      'GET /api/gcs/files',
      'DELETE /api/gcs/files/:fileName',
      'GET /api/gcs/files/:fileName/metadata'
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

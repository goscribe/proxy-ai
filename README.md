# Proxy AI Inference Server

A simple Express.js server with CORS (Cross-Origin Resource Sharing) enabled for development and API testing.

## Features

- ✅ Express.js server with CORS
- ✅ JSON body parsing and error handling
- ✅ Health check endpoint with service status
- ✅ Cohere AI inference endpoint
- ✅ Google Cloud Storage proxy with secure URLs
- ✅ File upload, download, and management
- ✅ API documentation endpoint
- ✅ Environment variable configuration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env file and add your API keys
echo "COHERE_API_KEY=your_cohere_api_key_here" > .env
echo "GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name" >> .env

# Google Cloud Configuration (choose one option):
# Option 1: Using key file
echo "GCP_PROJECT_ID=your_project_id" >> .env
echo "GCP_KEY_FILE=path/to/service-account-key.json" >> .env

# Option 2: Using individual credentials
echo "GCP_PROJECT_ID=your_project_id" >> .env
echo "GCP_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com" >> .env
echo "GCP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n..." >> .env

# Option 3: Legacy variable names (still supported)
echo "GOOGLE_CLOUD_PROJECT_ID=your_project_id" >> .env
echo "GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json" >> .env
```

3. Start the server:
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## Usage

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

### Available Endpoints

- `GET /` - Server status and version info
- `GET /api/health` - Health check with service status
- `GET /api/models` - Available AI models information
- `GET /api/docs` - API documentation
- `POST /api/data` - Example endpoint that accepts JSON data
- `POST /api/cohere/inference` - Cohere AI text generation
- `POST /api/gcs/upload` - Upload file to Google Cloud Storage
- `GET /api/gcs/download/:fileName` - Get signed URL for file download
- `GET /api/gcs/files` - List all files in GCS bucket
- `DELETE /api/gcs/files/:fileName` - Delete file from GCS bucket
- `GET /api/gcs/files/:fileName/metadata` - Get file metadata

### Testing with curl

```bash
# Test the root endpoint
curl http://localhost:3000/

# Test the health endpoint
curl http://localhost:3000/api/health

# Test POST endpoint
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"data": "Hello World"}'

# Test Cohere inference
curl -X POST http://localhost:3000/api/cohere/inference \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a short story about a robot", "model": "command", "max_tokens": 100}'

# Get available models
curl http://localhost:3000/api/models

# Get API documentation
curl http://localhost:3000/api/docs

# Test GCS file upload (replace with actual file)
curl -X POST http://localhost:3000/api/gcs/upload \
  -F "file=@/path/to/your/file.jpg"

# List GCS files
curl http://localhost:3000/api/gcs/files

# Get download URL for a file
curl http://localhost:3000/api/gcs/download/1234567890-abc123.jpg

### CORS Configuration

The server is configured to allow all origins for development. For production, you should modify the `corsOptions` in `server.js` to specify allowed origins:

```javascript
const allowedOrigins = ['http://localhost:3000', 'https://yourdomain.com'];
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `COHERE_API_KEY` - Your Cohere API key
- `GOOGLE_CLOUD_BUCKET_NAME` - Your GCS bucket name

### Google Cloud Configuration (choose one option):

**Option 1: Using key file**
- `GCP_PROJECT_ID` - Your Google Cloud Project ID
- `GCP_KEY_FILE` - Path to service account key file

**Option 2: Using individual credentials**
- `GCP_PROJECT_ID` - Your Google Cloud Project ID
- `GCP_CLIENT_EMAIL` - Service account email
- `GCP_PRIVATE_KEY` - Service account private key (with \n for newlines)

**Option 3: Legacy variable names (still supported)**
- `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud Project ID
- `GOOGLE_CLOUD_KEY_FILE` - Path to service account key file

- `NODE_ENV` - Environment (development/production)



## Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server with nodemon for development

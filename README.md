# Proxy AI Inference Server

A simple Express.js server with CORS (Cross-Origin Resource Sharing) enabled for development and API testing.

## Features

- ✅ Express.js server with CORS
- ✅ JSON body parsing and error handling
- ✅ Health check endpoint with service status
- ✅ Cohere AI inference endpoint
- ✅ API documentation endpoint
- ✅ Environment variable configuration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env file and add your API key
echo "COHERE_API_KEY=your_cohere_api_key_here" > .env
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

### CORS Configuration

The server is configured to allow all origins for development. For production, you should modify the `corsOptions` in `server.js` to specify allowed origins:

```javascript
const allowedOrigins = ['http://localhost:3000', 'https://yourdomain.com'];
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `COHERE_API_KEY` - Your Cohere API key
- `NODE_ENV` - Environment (development/production)



## Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server with nodemon for development

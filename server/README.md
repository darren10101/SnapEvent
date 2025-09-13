# SnapEvent Server

A barebones Express.js server for the SnapEvent application.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on port 3000 by default. You can access it at `http://localhost:3000`.

## Available Endpoints

- `GET /` - Welcome message and server status
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 3000)
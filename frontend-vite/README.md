# RAG Chatbot Frontend

A modern React frontend for the RAG-powered news chatbot with real-time messaging and responsive design.

## Features

- **Real-time Chat**: WebSocket integration with Socket.IO for instant messaging
- **Responsive Design**: Mobile-first design with SCSS styling
- **Session Management**: Automatic session creation and management
- **Source Citations**: Clickable source links for news articles
- **Typing Indicators**: Visual feedback when bot is processing
- **Chat History**: Persistent chat history with session restore
- **Connection Status**: Real-time connection status indicator
- **Error Handling**: Graceful error handling and user feedback

## Tech Stack

- **Frontend Framework**: React 18
- **Styling**: SCSS with modern CSS features
- **Real-time Communication**: Socket.IO Client
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect)

## Prerequisites

- Node.js 18+
- Backend server running on port 5000

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/rag-chatbot-frontend.git
cd rag-chatbot-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Usage

1. Start the development server:
```bash
npm start
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. The app will automatically create a new session and connect to the backend

## Features Overview

### Chat Interface

- **Message Display**: Distinct styling for user and bot messages
- **Source Citations**: Bot responses include clickable source links
- **Timestamps**: All messages show send time
- **Auto-scroll**: Automatically scrolls to newest messages
- **Message Formatting**: Supports line breaks and formatting

### Real-time Features

- **Instant Messaging**: Messages sent via WebSocket for real-time experience
- **Typing Indicator**: Shows when bot is processing your message
- **Connection Status**: Visual indicator of WebSocket connection
- **Auto-reconnect**: Automatic reconnection on connection loss

### Session Management

- **Session Creation**: Automatic session creation on app start
- **Session Persistence**: Chat history persists during browser session
- **Session Reset**: Reset button clears chat history and starts fresh
- **Session ID Display**: Shows shortened session ID in footer

### User Experience

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Loading States**: Visual feedback during message processing
- **Error Handling**: User-friendly error messages with dismiss option
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for line breaks

## Component Structure

```
src/
├── App.js          # Main component with chat logic
├── App.scss        # Styles with responsive design
├── index.js        # React app entry point
└── index.css       # Base CSS styles
```

### Key Components

**App.js** - Main chat interface with:
- WebSocket connection management
- Message state management
- User input handling
- Session management
- Error handling

**App.scss** - Modern SCSS styling with:
- CSS Grid and Flexbox layouts
- CSS custom properties (variables)
- Smooth animations and transitions
- Responsive breakpoints
- Glassmorphism effects

## Styling Architecture

### Design System

```scss
// Color Palette
$primary-color: #2563eb      // Blue
$secondary-color: #f8fafc    // Light gray
$accent-color: #10b981       // Green
$error-color: #ef4444        // Red

// Gradients
$bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
$primary-gradient: linear-gradient(135deg, $primary-color, #1d4ed8)
```

### Key Features

- **Glas
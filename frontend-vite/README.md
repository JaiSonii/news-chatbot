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

- **Glassmorphism Effects**: Modern glass-like transparency effects
- **Smooth Animations**: CSS transitions and keyframe animations
- **Responsive Grid**: Mobile-first responsive design
- **Custom Scrollbars**: Styled scrollbars for better UX
- **Hover Effects**: Interactive hover states and micro-interactions

### Responsive Breakpoints

```scss
// Desktop First
@media (max-width: 1200px) { /* Large tablets */ }
@media (max-width: 768px)  { /* Tablets */ }
@media (max-width: 480px)  { /* Mobile phones */ }
```

## API Integration

### REST API Endpoints

```javascript
// Session Management
POST /api/sessions              // Create new session
GET /api/sessions/:id/history   // Get chat history
DELETE /api/sessions/:id        // Clear session

// Chat
POST /api/chat                  // Send message (fallback)
```

### WebSocket Events

```javascript
// Outgoing Events
socket.emit('join-session', sessionId)
socket.emit('send-message', { sessionId, message })
socket.emit('clear-session', sessionId)

// Incoming Events
socket.on('bot-response', (data) => { ... })
socket.on('bot-typing', (isTyping) => { ... })
socket.on('session-cleared', () => { ... })
socket.on('error', (error) => { ... })
```

## State Management

### Message State Structure

```javascript
const messageSchema = {
  id: 'unique-id',
  type: 'user' | 'bot',
  content: 'message text',
  sources: [{ title: 'Article Title', url: 'https://...' }],
  timestamp: 1640995200000
}
```

### Session State

```javascript
const sessionState = {
  sessionId: 'uuid-v4',
  messages: [...messageSchema],
  isLoading: false,
  isTyping: false,
  error: null,
  socket: socketInstance
}
```

## Performance Optimizations

### React Optimizations

- **useRef** for DOM element references
- **useCallback** for event handlers (if needed)
- **useMemo** for expensive calculations (if needed)
- **Proper key props** for list rendering

### Network Optimizations

- **WebSocket Connection Pooling**
- **Automatic Reconnection**
- **Request Debouncing** for rapid typing
- **Message Queuing** during disconnection

### UI Optimizations

- **Smooth Scrolling** with `scroll-behavior`
- **CSS Transforms** for animations
- **GPU Acceleration** with `will-change`
- **Optimized Re-renders** with proper state structure

## Accessibility

### WCAG Compliance

- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Screen reader accessibility
- **Keyboard Navigation**: Tab order and focus management
- **Color Contrast**: WCAG AA contrast ratios
- **Focus Indicators**: Clear focus states

### Keyboard Shortcuts

- `Enter`: Send message
- `Shift + Enter`: New line in message
- `Escape`: Close error messages
- `Tab`: Navigate through interface

## Error Handling

### Error States

```javascript
const errorTypes = {
  CONNECTION_ERROR: 'Failed to connect to server',
  SESSION_ERROR: 'Failed to create session',
  MESSAGE_ERROR: 'Failed to send message',
  NETWORK_ERROR: 'Network connection lost'
}
```

### Error UI

- **Toast Notifications**: Non-blocking error messages
- **Retry Mechanisms**: Automatic retry for failed operations
- **Graceful Degradation**: Fallback to REST API if WebSocket fails
- **User Feedback**: Clear error messages with action buttons

## Testing

### Component Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- App.test.js

# Watch mode
npm test -- --watch
```

### Test Structure

```javascript
// Example test
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

test('sends message on form submit', () => {
  render(<App />)
  const input = screen.getByPlaceholderText('Ask me about news...')
  const button = screen.getByRole('button', { name: /send/i })
  
  fireEvent.change(input, { target: { value: 'Test message' } })
  fireEvent.click(button)
  
  expect(screen.getByText('Test message')).toBeInTheDocument()
})
```

## Building and Deployment

### Development Build

```bash
npm start
# Starts dev server on http://localhost:3000
# Hot reloading enabled
# Source maps included
```

### Production Build

```bash
npm run build
# Creates optimized build in /build folder
# Code splitting and minification
# Service worker for caching
```

### Deployment Options

#### Netlify

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables
5. Deploy

#### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Set environment variables in dashboard

#### GitHub Pages

```bash
npm install --save-dev gh-pages
# Add to package.json scripts:
# "deploy": "gh-pages -d build"
npm run build
npm run deploy
```

### Environment Configuration

#### Development

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENV=development
```

#### Production

```env
REACT_APP_API_URL=https://your-api.herokuapp.com
REACT_APP_SOCKET_URL=https://your-api.herokuapp.com
REACT_APP_ENV=production
```

## Browser Support

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills Included

- CSS Grid (for older browsers)
- Flexbox (for IE11)
- WebSocket (fallback to polling)

## Customization

### Theme Customization

```scss
// Override variables in App.scss
$primary-color: #your-brand-color;
$bg-gradient: your-custom-gradient;
$border-radius: 8px; // Customize border radius
```

### Component Customization

```javascript
// Modify message rendering
const renderMessage = (message) => {
  // Add your custom logic here
  return (
    <div className="custom-message">
      {/* Your custom message template */}
    </div>
  )
}
```

## Performance Monitoring

### Metrics to Track

- **First Contentful Paint (FCP)**
- **Largest Contentful Paint (LCP)**
- **Cumulative Layout Shift (CLS)**
- **WebSocket Connection Time**
- **Message Send/Receive Latency**

### Monitoring Tools

```javascript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

## Development Guidelines

### Code Style

- Use functional components with hooks
- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic
- Keep components under 200 lines

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature
# Create pull request
```

## Troubleshooting

### Common Issues

**WebSocket Connection Failed**
```javascript
// Check if backend is running
// Verify CORS configuration
// Check firewall settings
```

**Messages Not Sending**
```javascript
// Check network connectivity
// Verify session creation
// Check browser console for errors
```

**Styling Issues**
```javascript
// Clear browser cache
// Check SCSS compilation
// Verify CSS imports
```

### Debug Mode

```javascript
// Add to .env for debug logs
REACT_APP_DEBUG=true

// Console debugging
console.log('Socket connected:', socket.connected)
console.log('Session ID:', sessionId)
console.log('Messages:', messages)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup

```bash
git clone https://github.com/JaiSonii/news-chatbot/tree/main
cd frontend-vite
npm install
npm start
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue
- Check the documentation
- Review the demo video
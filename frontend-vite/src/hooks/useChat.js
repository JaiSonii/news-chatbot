import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages/typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initialize session
  useEffect(() => {
    initializeSession();
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const initializeSession = async () => {
    try {
      let newSessionId = "";
      if (localStorage.getItem("sessionId")) {
        newSessionId = localStorage.getItem("sessionId");
      } else {
        const response = await axios.post(`${API_URL}/api/sessions`);
        newSessionId = response.data.sessionId;
        localStorage.setItem("sessionId", newSessionId);
      }
      setSessionId(newSessionId);

      // Connect socket
      const newSocket = io(API_URL);
      setSocket(newSocket);

      newSocket.emit("join-session", newSessionId);

      newSocket.on("bot-response", (data) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "bot",
            content: data.message,
            sources: data.sources,
            timestamp: data.timestamp,
          },
        ]);
        setIsLoading(false);
        setIsTyping(false);
      });

      newSocket.on("bot-typing", (typing) => setIsTyping(typing));
      newSocket.on("session-cleared", () => {
        setMessages([]);
        setError(null);
      });
      newSocket.on("error", (error) => {
        setError(error.message);
        setIsLoading(false);
        setIsTyping(false);
      });

      await loadSessionHistory(newSessionId);

      // First-time welcome message
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content:
              "Hello! I'm your news assistant. Ask me anything about recent news and I'll help you find relevant information from our database.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      setError("Failed to initialize session");
      console.error("Session initialization error:", error);
    }
  };

  const loadSessionHistory = async (sessionId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/sessions/${sessionId}/history`
      );
      const history = response.data.history;
      const formattedMessages = history.map((msg, index) => ({
        id: index,
        type: msg.role === "user" ? "user" : "bot",
        content: msg.content,
        sources: msg.sources || [],
        timestamp: msg.timestamp,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Failed to load session history:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !sessionId) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    if (socket) {
      socket.emit("send-message", {
        sessionId,
        message: inputMessage.trim(),
      });
    } else {
      try {
        const response = await axios.post(`${API_URL}/api/chat`, {
          sessionId,
          message: inputMessage.trim(),
        });

        const botMessage = {
          id: Date.now() + 1,
          type: "bot",
          content: response.data.response,
          sources: response.data.sources,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
        setError("Failed to send message");
        console.error("Send message error:", error);
      }
      setIsLoading(false);
    }

    setInputMessage("");
    inputRef.current?.focus();
  };

  const resetSession = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);

      if (socket) {
        socket.emit("clear-session", sessionId);
      } else {
        await axios.delete(`${API_URL}/api/sessions/${sessionId}`);
        setMessages([]);
      }

      setError(null);

      setTimeout(() => {
        setMessages([
          {
            id: "welcome-reset",
            type: "bot",
            content:
              "Session has been reset. How can I help you with news today?",
            timestamp: Date.now(),
          },
        ]);
      }, 500);
    } catch (error) {
      setError("Failed to reset session");
      console.error("Reset session error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sessionId,
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    isTyping,
    socket,
    error,
    setError,
    sendMessage,
    resetSession,
    messagesEndRef,
    inputRef,
  };
}

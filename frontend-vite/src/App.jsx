import React from "react";
import useChat from "./hooks/useChat";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import ChatFooter from "./components/ChatFooter";

function App() {
  const {
    messages,
    isTyping,
    error,
    socket,
    sessionId,
    isLoading,
    sendMessage,
    resetSession,
    inputMessage,
    setInputMessage,
    inputRef,
    messagesEndRef,
    setError,
  } = useChat();

  return (
    <div className="flex flex-col h-screen bg-gray-100 w-[100vw]">
      <ChatHeader onReset={resetSession} isLoading={isLoading} />

      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="flex justify-between items-center mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="font-bold">×</button>
          </div>
        )}
        <MessageList
          messages={messages}
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
        />
      </main>

      <MessageInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        sendMessage={sendMessage}
        isLoading={isLoading}
        inputRef={inputRef}
      />

      <ChatFooter socket={socket} sessionId={sessionId} />
    </div>
  );
}

export default App;
import ChatMessage from "./ChatMessage";

export default function MessageList({ messages, isTyping, messagesEndRef }) {
  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isTyping && (
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
          </div>
          <span className="text-sm">Assistant is typing...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

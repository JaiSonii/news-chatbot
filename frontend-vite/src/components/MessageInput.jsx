export default function MessageInput({
  inputMessage,
  setInputMessage,
  sendMessage,
  isLoading,
  inputRef,
}) {
  return (
    <form
      onSubmit={sendMessage}
      className="px-6 py-4 bg-white border-t border-gray-200"
    >
      <div className="flex items-center space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask me about news..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="px-5 py-3 bg-blue-600 text-white rounded-full transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "⏳" : "➤"}
        </button>
      </div>
    </form>
  );
}
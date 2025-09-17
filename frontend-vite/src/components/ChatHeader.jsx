export default function ChatHeader({ onReset, isLoading }) {
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-blue-800 text-white shadow-lg">
      <div>
        <h1 className="text-xl font-bold">📰 News Chat Assistant</h1>
        <p className="text-sm opacity-90">Powered by RAG & AI</p>
      </div>
      <button
        onClick={onReset}
        disabled={isLoading}
        className="px-4 py-2 bg-white text-blue-800 rounded-lg hover:bg-gray-100 transition-colors"
      >
        🔄 Reset
      </button>
    </header>
  );
}
export default function ChatMessage({ message }) {
  const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className={`flex ${
        message.type === "user" ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`max-w-xs md:max-w-md p-4 rounded-3xl shadow-md transition-all ${
          message.type === "user"
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-200 text-gray-900 rounded-bl-none"
        }`}
      >
        <div>{message.content}</div>

        {message.sources?.length > 0 && (
          <div className="mt-2 text-sm text-gray-700">
            <span className="font-bold">Sources:</span>
            {message.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 underline hover:no-underline"
              >
                {src.title}
              </a>
            ))}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400 text-right">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
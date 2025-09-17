export default function ChatFooter({ socket, sessionId }) {
  return (
    <footer className="flex justify-between items-center px-6 py-2 bg-gray-100 text-sm text-gray-600">
      <span
        className={socket?.connected ? "text-green-600" : "text-red-600"}
      >
        {socket?.connected ? "🟢 Connected" : "🔴 Disconnected"}
      </span>
      {sessionId && (
        <span className="text-gray-500">Session: {sessionId.slice(-8)}</span>
      )}
    </footer>
  );
}

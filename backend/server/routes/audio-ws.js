const TRANSCRIPTION_URL = process.env.TRANSCRIPTION_URL || "http://localhost:8000/transcribe";
const MAX_HISTORY_MESSAGES = 10;

const conversations = new Map();

function getRecentHistory(socketId) {
  return conversations.get(socketId) || [];
}

function addMessage(socketId, message) {
  const history = getRecentHistory(socketId);
  const nextHistory = [...history, message].slice(-MAX_HISTORY_MESSAGES);
  conversations.set(socketId, nextHistory);
  return nextHistory;
}

function buildPrompt(history) {
  const conversation = history
    .map((message) => `${message.role === "user" ? "User" : "Guia"}: ${message.text}`)
    .join("\n");

  return `You are Guia, a survival advisor. Use the recent conversation to answer the user's latest request.

${conversation}

Respond clearly and helpfully. Even if the situation is unrelated to survival, answer briefly and naturally.`;
}

export function registerAudioSocket(namespace, {ai, modelName}) {
  namespace.on("connection", (socket) => {
    console.log(`Audio client connected: ${socket.id}`);

    socket.on("audio-start", () => {
      socket.emit("audio-event-ack", { type: "audio-start" });
    });

    socket.on("audio-frame", async (frame) => {
      try {
        const wavBuffer = Buffer.isBuffer(frame) ? frame : Buffer.from(frame);

        socket.emit("audio-frame-ack", {
          bytes: wavBuffer.length,
        });

        const formData = new FormData();
        const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });

        formData.append("file", audioBlob, "speech.wav");

        const response = await fetch(TRANSCRIPTION_URL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const message = await response.text();
          socket.emit("audio-error", {
            message: `Transcription failed: ${message}`,
          });
          return;
        }

        const data = await response.json();
        const transcript = data.text?.trim();

        if (!transcript) {
          socket.emit("audio-error", {
            message: "Whisper returned an empty transcript. No text returned.",
          });
          return;
        }

        const history = addMessage(socket.id, {
          role: "user",
          text: transcript,
        });

        socket.emit("transcript", {
          text: transcript,
        });

        const prompt = buildPrompt(history);

        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: [{ text: prompt }],
        });

        let assistantText = "";
        socket.emit("audio-response-start");

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            assistantText += text;
            socket.emit("audio-response-chunk", { text });
          }
        }

        if (assistantText.trim()) {
          addMessage(socket.id, {
            role: "assistant",
            text: assistantText.trim(),
          });
        }
      
        socket.emit("audio-response-complete");

      } catch (error) {
        socket.emit("audio-error", {
          message: error instanceof Error ? error.message : "Audio transcription failed.",
        });
      }

    });

    socket.on("audio-stop", () => {
      socket.emit("audio-event-ack", { type: "audio-stop" });
    });

    socket.on("disconnect", () => {
      conversations.delete(socket.id);
      console.log(`Audio client disconnected: ${socket.id}`);
    });
  });
}

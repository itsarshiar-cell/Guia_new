import { getRecentHistory, addMessage, enqueue, clearSession } from "../conversations.js";

const TRANSCRIPTION_MODEL = process.env.GEMINI_TRANSCRIPTION_MODEL || "gemini-3.5-transcribe";

function buildPrompt(history) {
  const conversation = history
    .map((message) => `${message.role === "user" ? "User" : "Guia"}: ${message.text}`)
    .join("\n");

  return `You are Guia, a survival advisor. Use the recent conversation to answer the user's latest request.

${conversation}

Respond clearly and helpfully. Even if the situation is unrelated to survival, answer briefly and naturally.`;
}

async function transcribeAudio(ai, wavBuffer) {
  let uploadedAudio;

  try {
    uploadedAudio = await ai.files.upload({
      file: new Blob([wavBuffer], { type: "audio/wav" }),
      config: {
        mimeType: "audio/wav",
        displayName: "speech.wav",
      },
    });

    if (!uploadedAudio.uri) {
      throw new Error("Gemini did not return an audio file URI.");
    }

    const interaction = await ai.interactions.create({
      model: TRANSCRIPTION_MODEL,
      input: [
        {
          type: "audio",
          uri: uploadedAudio.uri,
          mime_type: uploadedAudio.mimeType || "audio/wav",
        },
      ],
    });

    if (interaction.status !== "completed") {
      throw new Error(`Gemini transcription did not complete (status: ${interaction.status}).`);
    }

    return interaction.output_text?.trim() || "";
  } finally {
    if (uploadedAudio?.name) {
      await ai.files.delete({ name: uploadedAudio.name }).catch((error) => {
        console.warn("Could not delete temporary Gemini audio file:", error);
      });
    }
  }
}

// Handshake allows multiple sockets to share a conversation session. The sessionId is used to identify the conversation history and task queue for that session. If no sessionId is provided, the socket's own ID is used as the session key.
async function respondToMessage(socket, text, ai, modelName) {
  const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;

  // add the user's message immediately to history so the queued generator sees it
  const history = addMessage(sessionId, { role: "user", text });

  // enqueue the actual generation so only one response runs per session at a time
  await enqueue(sessionId, async () => {
    const prompt = buildPrompt(getRecentHistory(sessionId));
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ text: prompt }],
    });

    let assistantText = "";
    socket.emit("audio-response-start");

    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        assistantText += chunkText;
        socket.emit("audio-response-chunk", { text: chunkText });
      }
    }

    if (assistantText.trim()) {
      addMessage(sessionId, { role: "assistant", text: assistantText.trim() });
    }

    socket.emit("audio-response-complete");
  });
}

export function registerAudioSocket(namespace, {ai, modelName}) {
  namespace.on("connection", (socket) => {
    console.log(`Audio client connected: ${socket.id}`);
    const initialSessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
    console.log(`Audio client sessionId resolved: ${initialSessionId}`);

    socket.on("audio-start", () => {
      socket.emit("audio-event-ack", { type: "audio-start" });
    });

    socket.on("audio-frame", async (frame) => {
      try {
        const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
        console.log(`audio-frame received for sessionId: ${sessionId}`);
        const wavBuffer = Buffer.isBuffer(frame) ? frame : Buffer.from(frame);

        socket.emit("audio-frame-ack", {
          bytes: wavBuffer.length,
        });

        const transcript = await transcribeAudio(ai, wavBuffer);

        if (!transcript) {
          socket.emit("audio-error", {
            message: "Gemini returned an empty transcript. No text returned.",
          });
          return;
        }

        socket.emit("transcript", {
          text: transcript,
        });

        await respondToMessage(socket, transcript, ai, modelName);

      } catch (error) {
        socket.emit("audio-error", {
          message: error instanceof Error ? error.message : "Audio transcription failed.",
        });
      }

    });

    socket.on("text-message", async (payload) => {
      const text = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (!text) {
        socket.emit("audio-error", { message: "Enter a message before sending." });
        return;
      }

      try {
        const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
        console.log(`text-message received for sessionId: ${sessionId} text=${text.slice(0,80)}`);
        await respondToMessage(socket, text, ai, modelName);
      } catch (error) {
        socket.emit("audio-error", {
          message: error instanceof Error ? error.message : "Text response failed.",
        });
      }
    });

    socket.on("audio-stop", () => {
      socket.emit("audio-event-ack", { type: "audio-stop" });
    });

    socket.on("disconnect", () => {
      const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
      // only clear session data if it was using the socket id as the session key
      if (sessionId === socket.id) clearSession(sessionId);
      console.log(`Audio client disconnected: ${socket.id}`);
    });
  });
}

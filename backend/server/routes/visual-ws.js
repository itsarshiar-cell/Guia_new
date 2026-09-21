import { getRecentHistory, addMessage, enqueue, clearSession } from "../conversations.js";

const SURVIVAL_PROMPT = `
You are a survival advisor. Analyze this image frame and respond with survival advice only if the scene contains a survival situation.
If there is no survival advice, respond with: "No survival advice is necessary."
`;

export function registerVisualSocket(namespace, { ai, modelName }) {
  namespace.on("connection", (socket) => {
    console.log(`Visual client connected: ${socket.id}`);
    const initialSessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
    console.log(`Visual client sessionId resolved: ${initialSessionId}`);

    socket.on("analyze-frame", async (data = {}) => {
      try {
        if (!data.imageBase64) {
          socket.emit("server-error", { message: "Missing imageBase64." });
          return;
        }

        const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
        console.log(`analyze-frame received for sessionId: ${sessionId}`);

        // enqueue visual analysis so it doesn't overlap with other generations for the same session
        await enqueue(sessionId, async () => {
          const history = getRecentHistory(sessionId);

          const promptText = `${history
            .map((m) => `${m.role === "user" ? "User" : "Guia"}: ${m.text}`)
            .join("\n")}\n\n${SURVIVAL_PROMPT}`;

          const stream = await ai.models.generateContentStream({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: data.imageBase64,
                },
              },
              { text: promptText },
            ],
          });

          let assistantText = "";
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              assistantText += text;
              socket.emit("response-chunk", { text });
            }
          }

          if (assistantText.trim()) {
            addMessage(sessionId, { role: "assistant", text: assistantText.trim() });
          }

          socket.emit("analysis-complete");
        });
      } catch (error) {
        socket.emit("server-error", {
          message: error instanceof Error ? error.message : "Visual analysis failed.",
        });
      }
    });

    socket.on("disconnect", () => {
      const sessionId = socket.handshake?.auth?.sessionId || socket.handshake?.query?.sessionId || socket.id;
      if (sessionId === socket.id) clearSession(sessionId);
      console.log(`Visual client disconnected: ${socket.id}`);
    });
  });
}

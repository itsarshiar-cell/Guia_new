const SURVIVAL_PROMPT = `
You are a survival advisor. Analyze this image frame and respond with survival advice only if the scene contains a survival situation.
If there is no survival advice, respond with: "No survival advice is necessary."
`;

export function registerVisualSocket(namespace, { ai, modelName }) {
  namespace.on("connection", (socket) => {
    console.log(`Visual client connected: ${socket.id}`);

    socket.on("analyze-frame", async (data = {}) => {
      try {
        if (!data.imageBase64) {
          socket.emit("server-error", { message: "Missing imageBase64." });
          return;
        }

        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: data.imageBase64,
              },
            },
            { text: SURVIVAL_PROMPT },
          ],
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) socket.emit("response-chunk", { text });
        }

        socket.emit("analysis-complete");
      } catch (error) {
        socket.emit("server-error", {
          message: error instanceof Error ? error.message : "Visual analysis failed.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Visual client disconnected: ${socket.id}`);
    });
  });
}

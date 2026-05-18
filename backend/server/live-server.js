import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import { registerAudioSocket } from "./routes/audio-ws.js";
import { registerVisualSocket } from "./routes/visual-ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const MODEL_NAME = process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

registerVisualSocket(io.of("/visual"), { ai, modelName: MODEL_NAME });
registerAudioSocket(io.of("/audio"), { ai, modelName: MODEL_NAME });

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
  console.log(`Visual namespace ready at http://localhost:${PORT}/visual`);
  console.log(`Audio namespace ready at http://localhost:${PORT}/audio`);
});

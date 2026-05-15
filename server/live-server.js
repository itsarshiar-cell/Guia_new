
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import dotenv from 'dotenv';

// dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// const httpServer = createServer();
// const io = new Server(httpServer, {
//   cors: {
//     origin: 'http://localhost:3000',
//     methods: ['GET', 'POST'],
//   },
// });

// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   socket.on('analyze-frame', async (data) => {
//   console.log('Received frame length:', data.imageBase64?.length);

//   try {
//     const stream = await model.generateContentStream({
//       contents: [{
//         role: 'user',
//         parts: [
//           { text: 'Analyze this frame.' },
//           { inlineData: { mimeType: 'image/jpeg', data: data.imageBase64 } }
//         ]
//       }]
//     });

//     for await (const chunk of stream.stream) {
//       const text = chunk.text();
//       socket.emit('response-chunk', { text }); // Send back to frontend
//     }
//     socket.emit('analysis-complete');
//   } catch (error) {
//     socket.emit('server-error', { message: error.message });
//   }
// });

//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });

// httpServer.listen(3001, () => {
//   console.log('WebSocket server on ws://localhost:3001');
// });





import { createServer } from "http";
import { Server } from "socket.io";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";


dotenv.config({path: ".env.local"});

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });
//WORKS: gemma-3-4b-it
//techniclaly works but sucks at giving advice (doesnt give any advice at all): gemma-3-12b-it
//works ver well: gemma-3-27b-it
//valid model, should work: gemma-4-31b-it

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemma-4-26b-a4b-it";
//gemma-4-26b-a4b-it

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);


  socket.on("analyze-frame", async (data) => {
    try {
      const prompt = `
You are a survival advisor. Analyze this image frame and respond with survival advice only if the scene contains a survival situation.
If there is no survival advice, respond with: "No survival advice necessary."
      `;

      // const stream = await model.generateContentStream({
      //   contents: [
      //     {
      //       role: "user",
      //       parts: [
      //         { text: prompt },
      //         {
      //           inlineData: {
      //             // data: "say hi",
      //             mimeType: "image/jpeg",
      //             data: data.imageBase64,
      //           },
      //         },
      //       ],
      //     },
      //   ],
      // })
      const stream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: data.imageBase64,
            },
          },
          { text: prompt },
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) socket.emit("response-chunk", { text });
      }

    ;

      // for await (const chunk of stream.stream) {
      //   const text = chunk.text();
      //   if (text) socket.emit("response-chunk", { text });
      // }

      socket.emit("analysis-complete");
    } catch (error) {
      socket.emit("server-error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(3001, () => {
  console.log("WebSocket server on ws://localhost:3001");
});
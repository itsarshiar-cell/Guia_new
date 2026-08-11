


// "use client";

// import { useState } from "react";

// export default function AnalyzePage() {
//   const [result, setResult] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleFileChange(event) {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     setResult("");
//     setError("");

//     if (!file.type.startsWith("image/")) {
//       setError("Please upload an image file.");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("image", file);

//     try {
//       setLoading(true);

//       const response = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();

//       if (!response.ok || !data.success) {
//         setError(data.error || "Upload failed.");
//         return;
//       }

//       setResult(data.data);
//     } catch (err) {
//       setError("Something went wrong while uploading the image.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12">
//       <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-md">
//         <h1 className="mb-4 text-3xl font-semibold text-zinc-900">
//           Image Analyzer
//         </h1>

//         <p className="mb-6 text-zinc-600">
//           Upload an image and get survival advice based on what Gemini sees.
//         </p>

//         <input
//           type="file"
//           accept="image/*"
//           onChange={handleFileChange}
//           className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
//         />

//         {loading && (
//           <p className="mt-4 text-sm text-zinc-500">Analyzing image...</p>
//         )}

//         {error && (
//           <p className="mt-4 text-sm text-red-600">{error}</p>
//         )}

//         {result && (
//           <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-100 p-4">
//             <h2 className="mb-2 text-lg font-medium text-zinc-900">Result</h2>
//             <p className="whitespace-pre-wrap text-zinc-700">{result}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import MyButton from "../components/MyButton";
import Link from "next/link";
import { Camera, Mic, Send } from 'lucide-react';
import { MicVAD } from "@ricky0123/vad-web";

export default function AnalyzePage() {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const audioSocketRef = useRef(null);
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const isAnalysingRef = useRef(false);
  const vadRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [audioBytesSent, setAudioBytesSent] = useState(0);
  const [result, setResult] = useState("");
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [isTextSending, setIsTextSending] = useState(false);

  useEffect(() => {
    import("socket.io-client").then(({ default: io }) => {
      const socket = io("http://localhost:3001/visual", { reconnection: true, transports: ["websocket"] });
      const audioSocket = io("http://localhost:3001/audio", { reconnection: true, transports: ["websocket"] });

      socket.on("connect", () => {
        console.log("Connected to visual WebSocket server");
      });

      socket.on("connect_error", (error) => {
        console.error("Visual socket connect error", error);
        setCameraError(`Visual connection failed: ${error?.message || error}`);
      });

      socket.on("server-error", (data) => {
        console.error("Server error", data);
        setCameraError(data?.message || "Unknown server error");
        isAnalysingRef.current = false;
        setTimeout(() => {setCameraError("");}, 10000);
      });

      socket.on("response-chunk", (data) => {
        setResult((prev) => prev + (data.text || ""));
      });

      socket.on("analysis-complete", () => {
        isAnalysingRef.current = false;
        console.log("Analysis complete");
      });

      socketRef.current = socket;

      audioSocket.on("connect", () => {
        console.log("Connected to audio WebSocket server");
      });

      audioSocket.on("connect_error", (error) => {
        console.error("Audio socket connect error", error);
        setAudioError(`Audio connection failed: ${error?.message || error}`);
      });

      audioSocket.on("audio-frame-ack", (data) => {
        setAudioBytesSent((prev) => prev + (data.bytes || 0));
      });

      audioSocket.on("audio-event-ack", (data) => {
        console.log("Audio event acknowledged:", data.type);
      });

      audioSocket.on("transcript", (data) => {
        const text = data.text?.trim();
        if (!text) return;

        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            text,
          },
        ]);
      });

      audioSocket.on("audio-response-start", () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "",
          },
        ]);
      });

      audioSocket.on("audio-response-chunk", (data) => {
        const text = data.text || "";
        if (!text) return;

        setMessages((prev) => {
          const next = [...prev];
          const lastMessage = next[next.length - 1];

          if (lastMessage?.role === "assistant") {
            next[next.length - 1] = {
              ...lastMessage,
              text: lastMessage.text + text,
            };
            return next;
          }

          return [
            ...next,
            {
              role: "assistant",
              text,
            },
          ];
        });
      });

      audioSocket.on("audio-response-complete", () => {
        setIsTextSending(false);
        console.log("Audio response complete");
      });

      audioSocket.on("audio-error", (data) => {
        setIsTextSending(false);
        setAudioError(data?.message || "Audio transcription failed.");
      });

      audioSocketRef.current = audioSocket;
    });

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioSocketRef.current) {
        audioSocketRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function startCamera() {
    try {
      setCameraError("");
      setResult("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }

      frameIntervalRef.current = setInterval(() => {
        sendFrame();
      }, 2200);
    } catch (error) {
      setCameraError("Could not access the camera.");
      console.error(error);
    }
  }

  function stopCamera() {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }

  function sendFrame() {
    if (!videoRef.current || !socketRef.current) return;
    if (isAnalysingRef.current) return;
    isAnalysingRef.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    socketRef.current.emit("analyze-frame", {
      imageBase64,
      timestamp: Date.now(),
    });
  }

  function float32ToWavBuffer(audio, sampleRate = 16000) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audio.length * bytesPerSample;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer); 

    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < audio.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, audio[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

async function startAudio() {
  setAudioError("");

  const vad = await MicVAD.new({
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    
    onSpeechStart: () => {
      audioSocketRef.current?.emit("audio-start");
      
    },
    onSpeechEnd: (audio) => {
      const wavBuffer = float32ToWavBuffer(audio, 16000);

      audioSocketRef.current?.emit("audio-frame", wavBuffer);
      audioSocketRef.current?.emit("audio-stop");
    },
  });

  vadRef.current = vad;
  vad.start();
  setIsAudioOn(true);
}

  function stopAudio() {
  vadRef.current?.pause();
  vadRef.current = null;
  setIsAudioOn(false);
}

  function sendTextMessage(event) {
    event.preventDefault();
    const text = textInput.trim();

    if (!text || isTextSending || !audioSocketRef.current?.connected) return;

    setAudioError("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setTextInput("");
    setIsTextSending(true);
    audioSocketRef.current.emit("text-message", { text });
  }

  return (
    <div>
      <Header />
    <div className="flex flex-col py-10 items-center justify-center text-white">
      <div className="w-full max-w-6xl rounded-3xl bg-orange p-8">
        
        <div className="overflow-hidden rounded-xl bg-orange pb-8">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-auto w-full rounded-xl"
          />
        </div>

        <div className="mb-6 flex items-end gap-3 justify-center">
          <div className ="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={isCameraOn ? stopCamera : startCamera}
            aria-label={isCameraOn ? "Stop Camera" : "Start Camera"}
            title={isCameraOn ? "Stop Camera" : "Start Camera"}
            className={`backdrop-blur-md border border-white/20 rounded-3xl hover:bg-white/20 transition-all shadow-xl px-4 py-2 ${
              isCameraOn
                ? "bg-white text-orange border-white"
                : "bg-white/10 text-white border-white/20"
            }`}
          >
            <Camera size={35} className="text-white" />
          </button>

          <button
            type="button"
            onClick={isAudioOn ? stopAudio : startAudio}
            aria-label={isAudioOn ? "Stop Audio" : "Start Audio"}
            title={isAudioOn ? "Stop Audio" : "Start Audio"}
            className={`backdrop-blur-md border border-white/20 rounded-3xl hover:bg-white/20 transition-all shadow-xl px-4 py-2 ${
              isAudioOn
                ? "bg-white text-orange border-white"
                : "bg-white/10 text-white border-white/20"
            }`}
          >
            <Mic size={35} className="text-white" />
          </button>
          </div>
        </div>

        {cameraError && (
          <p className="mb-4 text-sm text-red-600">{cameraError}</p>
        )}

        {audioError && (
          <p className="mb-4 text-sm text-red-600">{audioError}</p>
        )}

        <p className="mt-4 text-sm text-white">
          Camera status: {isCameraOn ? "On" : "Off"}
        </p>

        <p className="mt-2 text-sm text-white">
          Audio status: {isAudioOn ? "Transmitting" : "Off"} · Bytes sent: {audioBytesSent}
        </p>
  
        
      </div>
    <div className="mt-10 w-full max-w-6xl rounded-3xl bg-orange p-8">
        <h2 className="mb-4 text-2xl font-semibold text-white">
          Conversation
        </h2>

        <div className="mb-6 flex flex-col gap-3 text-white">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-3xl rounded-2xl border border-white/20 px-4 py-3 ${
                  message.role === "user"
                    ? "self-end bg-white text-orange"
                    : "self-start bg-white/10 text-white"
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                  {message.role === "user" ? "You" : "Guia"}
                </p>
                <p className="whitespace-pre-wrap">
                  {message.text || "Thinking..."}
                </p>
              </div>
            ))
          ) : (
            <p>{result || "Waiting for Gemini response..."}</p>
          )}
        </div>

        <form onSubmit={sendTextMessage} className="flex items-end gap-3">
          <label htmlFor="conversation-input" className="sr-only">
            Message Guia
          </label>
          <textarea
            id="conversation-input"
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendTextMessage(event);
              }
            }}
            placeholder="Message Guia"
            rows={1}
            disabled={isTextSending}
            className="min-h-11 flex-1 resize-none rounded-lg border border-white/30 bg-white px-3 py-2 text-orange outline-none placeholder:text-orange/60 focus:border-white disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isTextSending}
            aria-label="Send message"
            title="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white bg-white text-orange transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}


// "use client";

// import { useEffect, useRef, useState } from "react";

// export default function AnalyzePage() {
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const socketRef = useRef(null);
//   const frameIntervalRef = useRef(null);

//   const [isCameraOn, setIsCameraOn] = useState(false);
//   const [cameraError, setCameraError] = useState("");

//   async function startCamera() {
//     try {
//       setCameraError("");

//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: false,
//       });

//       streamRef.current = stream;

//       if (videoRef.current) {
//         videoRef.current.srcObject = stream; //shows the camera stream in the video element
//       }

//       setIsCameraOn(true);
    
//     if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
//     frameIntervalRef.current = setInterval(() => {
//       sendFrame();
//     }, 1000);

//     } catch (error) {
//       setCameraError("Could not access the camera.");
//       console.error(error);
//     }
//   }

//   function stopCamera() {
//     if (frameIntervalRef.current) {
//       clearInterval(frameIntervalRef.current);
//       frameIntervalRef.current = null;
//     }

//     if (streamRef.current) {
//       for (const track of streamRef.current.getTracks()) {
//         track.stop();
//       }
//       streamRef.current = null;
//     }

//     if (videoRef.current) {
//       videoRef.current.srcObject = null;
//     }

//     setIsCameraOn(false);
//   }
  
//   function sendFrame() {
//   if (!videoRef.current || !socketRef.current) return;

//   // Convert video frame to base64
//   const canvas = document.createElement('canvas');
//   canvas.width = videoRef.current.videoWidth;
//   canvas.height = videoRef.current.videoHeight;

//   const ctx = canvas.getContext('2d');
//   ctx.drawImage(videoRef.current, 0, 0);

//   // Get base64 (remove the "data:image/jpeg;base64," prefix)
//   const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

//   // Send to backend
//   socketRef.current.emit('analyze-frame', {
//     imageBase64,
//     timestamp: Date.now(),
//   });

//   console.log('Sent frame:', imageBase64.length, 'bytes');
// }



//   // useEffect(() => {
//   //   return () => {
//   //     if (streamRef.current) {
//   //       for (const track of streamRef.current.getTracks()) {
//   //         track.stop();
//   //       }
//   //     }
//   //   };
//   // }, []);

//   useEffect(() => {
//   // Connect to WebSocket when component mounts
//   import('socket.io-client').then(({ default: io }) => {
//     const socket = io('ws://localhost:3001', {
//       reconnection: true,
//     });

//     socket.on('connect', () => {
//       console.log('Connected to WebSocket server');
//     });

//     socket.on('connect_error', (error) => {
//       console.error('Socket connect error', error);
//       setCameraError(`WebSocket connect error: ${error?.message || error}`);
//     });

//     socket.on('error', (data) => {
//       console.error('Socket server error', data);
//       setCameraError(`Server error: ${data?.message || JSON.stringify(data)}`);
//     });

//     socket.on('server-error', (data) => {
//       console.error('Server error', data);
//       setCameraError(data?.message || 'Unknown server error');
//     });

//     socket.on('response-chunk', (data) => {
//       console.log('Received response chunk:', data.text);
//     });

//     socket.on('analysis-complete', () => {
//       console.log('Analysis complete');
//     });


//     socketRef.current = socket;
//   });

//   return () => {
//     if (socketRef.current) {
//       socketRef.current.disconnect();
//     }
//   };
// }, []);


//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12">
//       <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-md">
//         <h1 className="mb-4 text-3xl font-semibold text-zinc-900">
//           Live Camera Analyzer
//         </h1>

//         <p className="mb-6 text-zinc-600">
//           Start your camera first. We’ll add live Gemini streaming after this works.
//         </p>

//         <div className="mb-6 flex gap-3">
//           <button
//             type="button"
//             onClick={startCamera}
//             className="rounded-lg bg-black px-4 py-2 text-white"
//           >
//             Start Camera
//           </button>

//           <button
//             type="button"
//             onClick={stopCamera}
//             className="rounded-lg border border-zinc-300 px-4 py-2"
//           >
//             Stop Camera
//           </button>
//         </div>

//         {cameraError && (
//           <p className="mb-4 text-sm text-red-600">{cameraError}</p>
//         )}

//         <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black">
//           <video
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted
//             className="h-auto w-full"
//           />
//         </div>

//         <p className="mt-4 text-sm text-zinc-500">
//           Camera status: {isCameraOn ? "On" : "Off"}
//         </p>
//       </div>
//     </div>
//   );
// }




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

export default function AnalyzePage() {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const isAnalysingRef = useRef(false);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    import("socket.io-client").then(({ default: io }) => {
      const socket = io("http://localhost:3001", { reconnection: true, transports: ["websocket"] });

      socket.on("connect", () => {
        console.log("Connected to WebSocket server");
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connect error", error);
        setCameraError(`Connection failed: ${error?.message || error}`);
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
    });

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-4 text-3xl font-semibold text-zinc-900">
          Live Camera Analyzer
        </h1>

        <p className="mb-6 text-zinc-600">
          ITS WORKING
        </p>

        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Start Camera
          </button>

          <button
            type="button"
            onClick={stopCamera}
            className="rounded-lg border border-zinc-300 px-4 py-2"
          >
            Stop Camera
          </button>
        </div>

        {cameraError && (
          <p className="mb-4 text-sm text-red-600">{cameraError}</p>
        )}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-auto w-full"
          />
        </div>

        <p className="mt-4 text-sm text-zinc-500">
          Camera status: {isCameraOn ? "On" : "Off"}
        </p>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-100 p-4">
          <h2 className="mb-2 text-lg font-medium text-zinc-900">
            Gemini Response
          </h2>

          <p className="whitespace-pre-wrap text-zinc-700">
            {result || "Waiting for Gemini response..."}
          </p>
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

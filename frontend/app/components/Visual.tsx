import React from 'react'
import { Camera, Mic } from 'lucide-react';

const Visual = () => {
  return (
    <div className="max-w-6xl mx-auto left-align text-white">
    <div className="max-w-6xl h-150 mx-auto rounded-3xl bg-white/20 backdrop-blur-md border-white/20 flex items-end pb-10 justify-center shadow-md">
    <div className=" grid grid-cols-2 gap-3 items-stretch">
        <div className="col-start-1 row-start-1  rounded-3xl p-3 justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all shadow-xl">
        <Camera size={35} className="text-white" /></div>
        <div className="col-start-2 row-start-1  rounded-3xl p-3 justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all shadow-xl">
        <Mic size={35} className="text-white" /></div>
    </div>
    </div>
    <div className="text-lg font-semibold tracking-tighter mt-10 mb-5">Transcript</div>
    <div className="max-w-6xl h-50 mx-auto rounded-3xl bg-white/20 backdrop-blur-md border-white/20 flex items-end pb-10 justify-center shadow-md mb-10">
    </div>
    <div className="max-w-6xl h-15 rounded-3xl bg-white/20 backdrop-blur-md border-white/20 flex items-center mx-auto px-6 left-alignshadow-md">
    | Ask Guia
    </div>
    </div>
  )
}

export default Visual
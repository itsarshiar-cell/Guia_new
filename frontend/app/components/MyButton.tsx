'use client'

interface Props {
  text: string;
}

export default function MyButton({ text }: Props) {
  return (
    <button className="h-full w-full max-w-[320px] p-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl hover:bg-white/20 transition-all shadow-xl">
        <span className="text-white text-xl tracking-tight font-light">{text}</span>
    </button>
  );
}
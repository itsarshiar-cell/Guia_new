import './globals.css';
import { Figtree } from 'next/font/google';

// Configure the font
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree', // This is the bridge to Tailwind
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Add the variable to the body class */}
      <body className={`${figtree.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
import Image from "next/image";
import Link from 'next/link';
import Header from "./components/Header";
import IntroPage from "./components/IntroPage";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div>
      <Header />
      <IntroPage />
      <Footer />
    </div>
  );
}

import Logo from "./Logo"
import NavBar from "./NavBar"
import Link from "next/link"

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* 1. px-6 to px-12: Padding shrinks on small screens and grows on big ones
        2. min-h-[70px]: It aims for 70px but can grow if the font size is huge
        3. max-w-7xl: Standard "safe" width for content (approx 1280px)
      */}
      <div className="mx-auto flex min-h-17.5 max-w-7xl items-center justify-between px-6 md:px-12 py-4 text-white">
        <Link href="/" className="hover:opacity-70 transition"><Logo /></Link>
        <NavBar />
      </div>
    </header>
  )
}

export default Header
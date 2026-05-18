"use client"

import Link from 'next/link' // Use this instead of react-router-dom
import { usePathname } from 'next/navigation' // Hook to get the current path

const NavBar = () => {
  const pathname = usePathname()

  return (
    <nav>
      <ul className="flex items-center gap-8 font-normal tracking-tight">
        <li><Link href="/analyze" className={`hover:opacity-100 transition ${
          pathname === '/analyze' ? 'opacity-100' : 'opacity-80'
        }`}
    >
          Analyze
        </Link></li>
        <li><Link href="/contact" className={`hover:opacity-100 transition ${
          pathname === '/contact' ? 'opacity-100' : 'opacity-80'
        }`}
    >
          Contact
        </Link></li>
      </ul>
    </nav>
  )
}

export default NavBar


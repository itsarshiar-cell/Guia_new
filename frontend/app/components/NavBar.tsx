import React from 'react'
import Link from 'next/link' // Use this instead of react-router-dom

const NavBar = () => {
  return (
    <nav>
      <ul className="flex items-center gap-8 font-normal tracking-tight">
        <li><Link href="/demo" className="hover:opacity-70 transition">Demo</Link></li>
        <li><Link href="/contact" className="hover:opacity-70 transition">Contact</Link></li>
      </ul>
    </nav>
  )
}

export default NavBar


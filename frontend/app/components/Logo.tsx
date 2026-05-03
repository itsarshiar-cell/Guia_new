import React from 'react'
import Image from 'next/image'

const Logo = () => {
  return (
    <Image 
      src="/guia.svg"   // No import needed, just a string starting with /
      alt="Logo" 
      width={79.45}       // Next.js Image component needs a width and height
      height={69} 
    />
  )
}

export default Logo
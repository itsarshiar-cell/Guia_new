import React from 'react'
import Header from "../components/Header"
import Visual from '../components/Visual'
import Footer from '../components/Footer'

const DemoPage = async() => {
  const res = await fetch('https://jsonplaceholder.typicode.com/users')
  const users = await res.json()
  
  return (
    <div>
      <Header />
      <Visual />
      <Footer />
    </div>
  )
}

export default DemoPage
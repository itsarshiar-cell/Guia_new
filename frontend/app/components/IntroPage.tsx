import React from 'react';
import Link from 'next/link';
import Logo from './Logo'; // Using your existing logo component
import MyButton from './MyButton'; // Using your existing button component

const IntroPage = () => {
  return (
    <div className="max-w-3xl mx-auto rounded-3xl py-10 pb-20 bg-orange">
      <div className="grid grid-cols-2 w-full items-start max-w-3xl mx-auto rounded-3xl">
  
  {/* Left Side: Logo and Text Stacked */}
  <div className="flex flex-col items-end">
    {/* Logo Wrapper */}
    <div className="h-30 scale-400 origin-top-right mb-12">
      <Logo />
    </div>

    {/* Text directly underneath, sharing the right edge */}
    <div className="text-right pr-2">
      <h2 className="text-4xl font-medium tracking-tighter text-white mt-0.5">
        Your guide <br />
        <span className="font-light">We provide.</span>
      </h2>
    </div>
  </div>

  {/* Right Side: The Box */}
  <div className="flex justify-start origin-bottom-left pl-10 pr-20 pt-15">
      <Link href="/demo"><MyButton text="Get Started" /></Link>
  </div>
  </div>
  {/* */}
  <div className="items-start max-w-3xl mx-auto ml-21 mr-20 text-white">
  <p className="tracking-tight font-light text-xl mt-20 mb-10">
    When in danger, Guia will provide you the steps you need to maximize 
  </p>
        {/* Features List */}
      <div className="space-y-12">
        {/* Item 1 */}
        <div className="flex gap-6">
          <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center italic font-serif text-2xl">
            1
          </div>
          <div>
            <h2 className="text-4xl font-medium mb-2 tracking-tighter">Information</h2>
            <p className="text-xl max-w-md tracking-tight font-light">
              With the use of visual and auditory data input and AI-powered feedback
            </p>
          </div>
        </div>


        {/* Item 2 */}
        <div className="flex gap-6">
          <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center italic font-serif text-2xl">
            2
          </div>
          <div>
            <h2 className="text-4xl font-medium mb-2 tracking-tighter">Connection</h2>
            <p className="text-xl max-w-md tracking-tight font-light">
              With the creation of a community hub people can use in danger
            </p>
          </div>
        </div>
      </div>
    </div>
</div>
  );
}

export default IntroPage;
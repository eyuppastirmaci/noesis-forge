import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center px-4 pt-32">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-2">
          <h1 className="text-8xl font-light text-gray-200 tracking-wider">
            404
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent w-full"></div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-medium text-gray-100">
            We Couldn't Find What You're Looking For
          </h2>
          <p className="text-gray-400 leading-relaxed">
            The intelligence you're seeking has wandered off into the digital void. 
            Let's guide you back to familiar territory.
          </p>
        </div>
        
        <div className="pt-4">
          <Link 
            href="/" 
            className="inline-flex items-center px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-200 font-medium transition-all duration-200 ease-in-out group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:translate-x-[-2px] transition-transform duration-200" />
            Return to NoesisForge
          </Link>
        </div>
        
        <div className="flex justify-center pt-8">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 rounded-full bg-gray-800 animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
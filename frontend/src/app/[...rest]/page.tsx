import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 pt-32">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-2">
          <h1 className="text-8xl font-light text-foreground tracking-wider">
            404
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-full"></div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-medium text-foreground">
            We Couldn&apos;t Find What You&apos;re Looking For
          </h2>
          <p className="text-foreground-secondary leading-relaxed">
            The intelligence you&apos;re seeking has wandered off into the digital void. 
            Let&apos;s guide you back to familiar territory.
          </p>
        </div>
        
        <div className="pt-4">
          <LinkButton 
            href="/" 
            variant="secondary"
            size="lg"
            className="group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:translate-x-[-2px] transition-transform duration-200" />
            Return to NoesisForge
          </LinkButton>
        </div>
        
        <div className="flex justify-center pt-8">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-border animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-border opacity-70 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 rounded-full bg-border opacity-50 animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
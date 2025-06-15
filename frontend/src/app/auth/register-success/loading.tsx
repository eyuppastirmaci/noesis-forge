import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Processing...</h2>
          
          <p className="text-muted-foreground">
            Setting up your account...
          </p>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
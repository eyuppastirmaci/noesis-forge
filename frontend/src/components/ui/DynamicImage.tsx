import React from 'react';
import dynamic from 'next/dynamic';
import { ImageProps } from 'next/image';
import { cn } from '../../lib/cn';

interface LoadingSkeletonProps {
  width?: number;
  height?: number;
  className?: string;
}

interface DynamicImageProps extends ImageProps {
  loadingSkeleton?: LoadingSkeletonProps;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  width = 64, 
  height = 64, 
  className = '' 
}) => (
  <div 
    className={cn('bg-background-secondary rounded border border-border animate-pulse flex items-center justify-center', className)}
    style={{ width: `${width}px`, height: `${height}px` }}
  >
    <div 
      className="bg-border rounded animate-pulse"
      style={{ 
        width: `${Math.max(12, width * 0.2)}px`, 
        height: `${Math.max(12, height * 0.2)}px` 
      }}
    />
  </div>
);

const createDynamicImage = (loadingSkeleton?: LoadingSkeletonProps) => {
  return dynamic(() => import('next/image'), {
    ssr: false,
    loading: () => <LoadingSkeleton {...loadingSkeleton} />,
  });
};

const DynamicImage: React.FC<DynamicImageProps> = ({ 
  loadingSkeleton, 
  ...imageProps 
}) => {
  const ImageComponent = React.useMemo(() => {
    return createDynamicImage(loadingSkeleton);
  }, [loadingSkeleton]);

  return <ImageComponent {...imageProps} />;
};

export default DynamicImage; 
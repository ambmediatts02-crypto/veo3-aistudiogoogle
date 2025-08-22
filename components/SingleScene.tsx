import React from 'react';
import { ImageUploader } from './ImageUploader';
import { BaseImage, VideoModel } from '../types';
import { XCircleIcon } from './icons';

interface SingleSceneProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    referenceImage: BaseImage | null;
    setReferenceImage: (image: BaseImage | null) => void;
    disabled: boolean;
    videoModel: VideoModel;
    setVideoModel: (model: VideoModel) => void;
}

const ModelButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
      isActive
        ? 'bg-brand-purple text-white'
        : 'bg-brand-bg-dark text-brand-text-secondary hover:bg-brand-border'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

export const SingleScene: React.FC<SingleSceneProps> = ({ 
    prompt, setPrompt, 
    referenceImage, setReferenceImage, 
    disabled, 
    videoModel, setVideoModel
}) => {
    
    const handleImageUpload = (images: BaseImage[]) => {
        // For single scene, we only take the first image
        setReferenceImage(images[0] || null);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-brand-text">1. Describe your video</h2>
                <div className="flex items-center gap-2 p-1 bg-brand-bg-dark rounded-full border border-brand-border">
                    <ModelButton onClick={() => setVideoModel(VideoModel.VEO_2)} isActive={videoModel === VideoModel.VEO_2} disabled={disabled}>VEO 2.0</ModelButton>
                    <ModelButton onClick={() => setVideoModel(VideoModel.VEO_3)} isActive={videoModel === VideoModel.VEO_3} disabled={disabled}>VEO 3.0</ModelButton>
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A neon hologram of a cat driving a sports car at top speed through a futuristic city..."
                className="w-full h-40 p-3 bg-brand-bg-dark border border-brand-border rounded-md focus:ring-2 focus:ring-brand-purple focus:outline-none transition resize-none text-brand-text-secondary"
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col gap-4">
               <h2 className="text-xl font-semibold text-brand-text">2. Add a reference image (optional)</h2>
               <div className="h-40">
                {referenceImage ? (
                     <div className="relative w-full h-full group">
                        <img src={`data:${referenceImage.mimeType};base64,${referenceImage.base64}`} alt="Reference" className="w-full h-full object-cover rounded-md" />
                        <button
                            onClick={() => setReferenceImage(null)}
                            disabled={disabled}
                            className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 disabled:hidden"
                            aria-label="Remove image"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-0 left-0 w-full p-2 bg-black bg-opacity-50 text-white text-xs truncate rounded-b-md">
                            {referenceImage.file.name}
                        </div>
                    </div>
                ) : (
                    <ImageUploader onImageUpload={handleImageUpload} disabled={disabled} containerClassName="h-40" />
                )}
               </div>
            </div>
        </div>
    );
};

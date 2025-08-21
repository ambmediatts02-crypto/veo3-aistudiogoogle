import React, { useCallback } from 'react';
import type { BaseImage } from '../types';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (images: BaseImage[]) => void;
  disabled: boolean;
  containerClassName?: string;
  multiple?: boolean;
}

const fileToBaseImage = (file: File): Promise<BaseImage> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return reject(new Error('File is not an image.'));
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          id: crypto.randomUUID(),
          file,
          base64: base64String,
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    onImageUpload, 
    disabled, 
    containerClassName = 'h-40', 
    multiple = false 
}) => {
  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    try {
      const fileList = Array.from(files);
      const imagePromises = fileList.map(fileToBaseImage);
      const images = await Promise.all(imagePromises);
      onImageUpload(images);
    } catch (error) {
      console.error("Error processing files:", error);
    }
  }, [onImageUpload]);

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className={`w-full ${containerClassName}`}>
      <label
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-brand-border rounded-md transition ${
          disabled ? 'cursor-not-allowed bg-brand-bg-dark/50' : 'cursor-pointer hover:border-brand-purple'
        }`}
      >
        <UploadIcon className="w-8 h-8 text-brand-text-secondary mb-2" />
        <span className="text-brand-text-secondary text-center text-sm px-2">
          Click or drag & drop
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files)}
          disabled={disabled}
          multiple={multiple}
        />
      </label>
    </div>
  );
};
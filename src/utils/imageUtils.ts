/**
 * Image processing utilities for Worker & Vehicle Photo Uploads
 */

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

/**
 * Process and resize an uploaded image file into a square or proportional high-res avatar
 * @param file The uploaded File or Blob
 * @param maxDim Maximum width or height (default 600px for crisp Retina displays)
 * @param quality Quality between 0.1 and 1.0 (default 0.88)
 */
export async function processProfileImage(
  file: File | Blob,
  maxDim: number = 600,
  quality: number = 0.88
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image (PNG, JPG, WebP)'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Square center-crop coordinates
          const minSide = Math.min(originalWidth, originalHeight);
          const startX = (originalWidth - minSide) / 2;
          const startY = (originalHeight - minSide) / 2;

          const targetDim = Math.min(maxDim, minSide);

          const canvas = document.createElement('canvas');
          canvas.width = targetDim;
          canvas.height = targetDim;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get 2D canvas context'));
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center-crop and draw into square
          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide,
            0,
            0,
            targetDim,
            targetDim
          );

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Estimate byte size from data URL
          const sizeBytes = Math.round((dataUrl.length * 3) / 4);

          resolve({
            dataUrl,
            width: targetDim,
            height: targetDim,
            sizeBytes,
            format: 'image/jpeg'
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

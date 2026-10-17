/**
 * Utility to compress images taken with camera or uploaded from gallery
 * Scales down high-resolution smartphone photos (e.g. 12MP-48MP) to maximum
 * 1200px width/height and compresses to JPEG ~100KB-250KB so that base64 strings
 * fit comfortably in localStorage without hitting storage quotas while keeping
 * receipt text and numbers razor-sharp.
 */

export const compressReceiptImage = (fileOrBlob: Blob, maxWidth = 1200, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Apply clean white background in case of transparent png
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(fileOrBlob);
  });
};

export const formatBase64Size = (base64Str: string): string => {
  if (!base64Str) return '0 KB';
  // Approx byte length from base64 string
  const padding = (base64Str.match(/=/g) || []).length;
  const bytes = (base64Str.length * 3) / 4 - padding;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

import imageCompression from "browser-image-compression";

export interface WebPConvertOptions {
  maxWidthOrHeight?: number;
  quality?: number; // 0 to 1, default 0.85
  maxSizeMB?: number;
}

/**
 * Converts any uploaded image File (JPEG, PNG, HEIC, etc.) to a true WebP File
 * with optimal resolution and size compression.
 */
export async function convertToWebP(
  file: File,
  options: WebPConvertOptions = {}
): Promise<File> {
  const {
    maxWidthOrHeight = 1200,
    quality = 0.85,
    maxSizeMB = 0.1, // ~100KB max
  } = options;

  try {
    // 1. First attempt: browser-image-compression with WebP target
    const compressionOptions = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: quality,
    };

    const compressedBlob = await imageCompression(file, compressionOptions);

    // Create a new WebP file object with clean .webp extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const webpFile = new File([compressedBlob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return webpFile;
  } catch (err) {
    console.warn("browser-image-compression fallback to Canvas WebP conversion:", err);
    // 2. Fallback: Canvas-based WebP conversion
    return new Promise<File>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
            if (width > height) {
              height = Math.round((height * maxWidthOrHeight) / width);
              width = maxWidthOrHeight;
            } else {
              width = Math.round((width * maxWidthOrHeight) / height);
              height = maxWidthOrHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Unable to create canvas context"));
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("WebP conversion failed"));
              }
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const convertedFile = new File([blob], `${baseName}.webp`, {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(convertedFile);
            },
            "image/webp",
            quality
          );
        };
        img.onerror = () => reject(new Error("Failed to load image for WebP conversion"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  }
}

import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

export interface CompressedImageVariant {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  base64?: string;
}

export interface CompressionResult {
  main: CompressedImageVariant;
  thumbnail: CompressedImageVariant;
}

const MAX_MAIN_DIMENSION = 1600;
const MAIN_QUALITY = 0.82; // 0.80 - 0.82 target 200-500 KB

const MAX_THUMB_DIMENSION = 320;
const THUMB_QUALITY = 0.72; // 0.70 - 0.75 target 20-60 KB

/**
 * Get natural dimensions of an image URI
 */
export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Measure byte size of a file URI by fetching as blob
 */
export async function getFileSizeBytes(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (err) {
    console.warn('[imageCompression] Failed to calculate file size from blob:', err);
    return 0;
  }
}

/**
 * Calculate scaled dimensions maintaining aspect ratio, never upscaling
 */
export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const maxSide = Math.max(originalWidth, originalHeight);

  // If already smaller than target, do not upscale
  if (maxSide <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = maxDimension / maxSide;
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

/**
 * Compress and generate two versions: Main photo (1600px max) & Thumbnail (320px max)
 */
export async function compressPhotoForUpload(originalUri: string): Promise<CompressionResult> {
  if (!originalUri) {
    throw new Error('Missing image URI for compression');
  }

  // 1. Get original dimensions
  let originalWidth = 1000;
  let originalHeight = 1000;

  try {
    const dims = await getImageDimensions(originalUri);
    originalWidth = dims.width;
    originalHeight = dims.height;
  } catch (err) {
    console.warn('[imageCompression] Could not get native size, using safe fallback:', err);
  }

  // 2. Compress Main Photo (Max 1600px, JPEG 0.82)
  const mainDims = calculateTargetDimensions(originalWidth, originalHeight, MAX_MAIN_DIMENSION);
  const mainActions: ImageManipulator.Action[] = [];

  if (mainDims.width !== originalWidth || mainDims.height !== originalHeight) {
    mainActions.push({
      resize: {
        width: mainDims.width,
        height: mainDims.height,
      },
    });
  }

  const manipulatedMain = await ImageManipulator.manipulateAsync(
    originalUri,
    mainActions,
    {
      compress: MAIN_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  const mainSizeBytes = manipulatedMain.base64
    ? Math.round((manipulatedMain.base64.length * 3) / 4)
    : await getFileSizeBytes(manipulatedMain.uri);

  // 3. Compress Thumbnail (Max 320px, JPEG 0.72)
  const thumbDims = calculateTargetDimensions(originalWidth, originalHeight, MAX_THUMB_DIMENSION);
  const thumbActions: ImageManipulator.Action[] = [
    {
      resize: {
        width: thumbDims.width,
        height: thumbDims.height,
      },
    },
  ];

  const manipulatedThumb = await ImageManipulator.manipulateAsync(
    originalUri,
    thumbActions,
    {
      compress: THUMB_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  const thumbSizeBytes = manipulatedThumb.base64
    ? Math.round((manipulatedThumb.base64.length * 3) / 4)
    : await getFileSizeBytes(manipulatedThumb.uri);

  return {
    main: {
      uri: manipulatedMain.uri,
      width: manipulatedMain.width,
      height: manipulatedMain.height,
      sizeBytes: mainSizeBytes,
      mimeType: 'image/jpeg',
      base64: manipulatedMain.base64,
    },
    thumbnail: {
      uri: manipulatedThumb.uri,
      width: manipulatedThumb.width,
      height: manipulatedThumb.height,
      sizeBytes: thumbSizeBytes,
      mimeType: 'image/jpeg',
      base64: manipulatedThumb.base64,
    },
  };
}

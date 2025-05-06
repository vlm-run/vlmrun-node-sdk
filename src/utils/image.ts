import { extname } from 'path';
import { DependencyError, InputError } from '../client/exceptions';

/**
 * Encodes an image file to base64
 * @param imagePath Path to the image file
 * @returns Base64 encoded image with data URI prefix
 */
export function encodeImage(imagePath: string): string {
  if (typeof window !== 'undefined') {
    throw new DependencyError('Image encoding is not supported in the browser', 'browser_limitation', 'Use server-side image encoding instead');
  }
  const { readFileSync } = require('fs');
  const imageBuffer = readFileSync(imagePath);
  const ext = extname(imagePath).toLowerCase().slice(1);
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const base64Image = imageBuffer.toString('base64');
  return `data:${mimeType};base64,${base64Image}`;
}

/**
 * Checks if a file is an image based on its extension
 * @param image Path to the file or base64 encoded image
 * @returns string with base64 encoded image
 */
export function processImage(image: string): string {
  if (image.startsWith('data:image/')) {
    return image;
  } else if (image.startsWith('https://') || image.startsWith('http://')) {
    return image;
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extname(image).toLowerCase())) {
    return encodeImage(image);
  }
  
  throw new InputError(`Invalid image file: ${image}`, "invalid_format", "Provide a valid image file path, URL, or base64 encoded image");
}

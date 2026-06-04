import { useState, useEffect } from 'react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function extractDominantColor(imageUrl: string): Promise<RGB> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Sample at lower resolution for performance
      const sampleSize = 50;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // Color frequency map
      const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();
      
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 10) * 10;
        const g = Math.round(data[i + 1] / 10) * 10;
        const b = Math.round(data[i + 2] / 10) * 10;
        
        // Skip very dark or very light colors
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;
        
        // Skip grays
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        if (saturation < 30) continue;
        
        const key = `${r},${g},${b}`;
        const existing = colorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(key, { count: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
        }
      }

      // Find most frequent vibrant color
      let maxCount = 0;
      let dominantColor: RGB = { r: 0, g: 255, b: 148 }; // Default to accent
      
      colorMap.forEach((value) => {
        const hsl = rgbToHsl(value.r, value.g, value.b);
        // Prefer saturated colors
        const score = value.count * (hsl.s / 50);
        if (score > maxCount) {
          maxCount = score;
          dominantColor = { r: value.r, g: value.g, b: value.b };
        }
      });

      resolve(dominantColor);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

export function useThemeColor(imageUrl: string | null) {
  const [color, setColor] = useState<RGB | null>(null);
  const [cssColor, setCssColor] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      setCssColor('');
      return;
    }

    setIsLoading(true);
    
    extractDominantColor(imageUrl)
      .then((rgb) => {
        setColor(rgb);
        setCssColor(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      })
      .catch(() => {
        setColor(null);
        setCssColor('');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [imageUrl]);

  return { color, cssColor, isLoading };
}

export function useThemeColorCSS(imageUrl: string | null) {
  const { color, cssColor, isLoading } = useThemeColor(imageUrl);

  useEffect(() => {
    const root = document.documentElement;
    
    if (color) {
      root.style.setProperty('--theme-color', cssColor);
      root.style.setProperty('--theme-color-r', String(color.r));
      root.style.setProperty('--theme-color-g', String(color.g));
      root.style.setProperty('--theme-color-b', String(color.b));
      root.style.setProperty('--theme-color-10', `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);
      root.style.setProperty('--theme-color-20', `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
      root.style.setProperty('--theme-color-50', `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
    } else {
      root.style.removeProperty('--theme-color');
      root.style.removeProperty('--theme-color-r');
      root.style.removeProperty('--theme-color-g');
      root.style.removeProperty('--theme-color-b');
      root.style.removeProperty('--theme-color-10');
      root.style.removeProperty('--theme-color-20');
      root.style.removeProperty('--theme-color-50');
    }

    return () => {
      root.style.removeProperty('--theme-color');
    };
  }, [color, cssColor]);

  return { color, cssColor, isLoading };
}

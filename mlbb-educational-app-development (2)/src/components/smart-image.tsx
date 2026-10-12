'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

/** Tiny plum gradient used as blur placeholder while the real image loads. */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoaSafe(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2a4c"/><stop offset="1" stop-color="#17131d"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>',
  );

function btoaSafe(value: string) {
  return typeof window === 'undefined' ? Buffer.from(value).toString('base64') : window.btoa(value);
}

/** Deterministic role-coloured SVG used whenever an image is missing or fails to load. */
export function fallbackImage(label: string, color = '#ad88ef') {
  const initial = (label.trim()[0] || '?').toUpperCase().replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="#17131d"/></linearGradient></defs><rect width="320" height="320" fill="url(#g)"/><text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="120" font-weight="700" fill="#f3f1f7" fill-opacity=".85">${initial}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoaSafe(svg);
}

function labelFromSrc(src: string) {
  const file = src.split('/').pop() || '';
  return file.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ');
}

type SmartImageProps = Omit<ImageProps, 'src' | 'width' | 'height'> & {
  src: string;
  width?: number;
  height?: number;
  /** Text used for the generated fallback initial. Defaults to alt text or file name. */
  fallbackLabel?: string;
  fallbackColor?: string;
  /** Opt in to Next.js resizing + srcset (use for large above-the-fold art). */
  optimize?: boolean;
};

/**
 * `next/image` wrapper with explicit dimensions, a blur placeholder and a graceful,
 * never-broken fallback. Images are served unoptimized: local hero art is already
 * pre-sized WebP, and stable URLs keep the service-worker offline cache deterministic.
 */
export function SmartImage({
  src,
  alt,
  width = 640,
  height = 360,
  fallbackLabel,
  fallbackColor,
  optimize = false,
  ...rest
}: SmartImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const label = fallbackLabel || alt || labelFromSrc(src);
  const failed = !src || failedSrc === src;
  const resolved = failed ? fallbackImage(label, fallbackColor) : src;
  return (
    <Image
      {...rest}
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      unoptimized={!optimize || failed}
      placeholder={failed ? 'empty' : 'blur'}
      blurDataURL={BLUR_DATA_URL}
      onError={() => setFailedSrc(src)}
    />
  );
}

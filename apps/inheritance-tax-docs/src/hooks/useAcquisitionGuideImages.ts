import { useCallback, useEffect, useState } from 'react';
import type { AcquisitionGuideId } from '@/constants/acquisitionGuides';

export type AcquisitionGuideImage = {
  id: number;
  guideId: AcquisitionGuideId;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  contentUrl: string;
};

const API_BASE = '/inheritance-tax-docs/api/acquisition-guide-images';
const RETRY_DELAYS_MS = [0, 300, 900] as const;

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const fetchImages = async (): Promise<AcquisitionGuideImage[]> => {
  let lastError: unknown;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) await wait(delay);
    try {
      const response = await fetch(API_BASE, { cache: 'no-store' });
      if (!response.ok) throw new Error('見本画像を読み込めませんでした');
      return await response.json() as AcquisitionGuideImage[];
    } catch (reason) {
      lastError = reason;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('見本画像を読み込めませんでした');
};

export const useAcquisitionGuideImages = () => {
  const [images, setImages] = useState<AcquisitionGuideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (): Promise<AcquisitionGuideImage[] | null> => {
    setLoading(true);
    setError('');
    try {
      const nextImages = await fetchImages();
      setImages(nextImages);
      return nextImages;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '見本画像を読み込めませんでした');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { images, loading, error, reload };
};

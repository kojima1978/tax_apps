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

export const useAcquisitionGuideImages = () => {
  const [images, setImages] = useState<AcquisitionGuideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('見本画像を読み込めませんでした');
      setImages(await response.json() as AcquisitionGuideImage[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '見本画像を読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { images, loading, error, reload };
};

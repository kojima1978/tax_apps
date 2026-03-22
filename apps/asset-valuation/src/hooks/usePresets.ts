import { useState, useCallback, useEffect } from 'react';
import type {
  MappingPreset,
  ColumnMapping,
  CategoryMapping,
  PresetExportData,
} from '@/types';

const STORAGE_KEY = 'asset-valuation-presets';

function loadPresets(): MappingPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as MappingPreset[];
  } catch {
    // ignore
  }
  return [];
}

function savePresets(presets: MappingPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function usePresets() {
  const [presets, setPresets] = useState<MappingPreset[]>(loadPresets);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const addPreset = useCallback(
    (name: string, columnMapping: ColumnMapping, categoryMapping: CategoryMapping) => {
      setPresets((prev) => {
        const existing = prev.findIndex((p) => p.name === name);
        const newPreset: MappingPreset = { name, columnMapping, categoryMapping };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newPreset;
          return updated;
        }
        return [...prev, newPreset];
      });
    },
    []
  );

  const deletePreset = useCallback((name: string) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
  }, []);

  const exportPresetsToJson = useCallback(() => {
    const data: PresetExportData = {
      version: '1.0',
      presets,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapping-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [presets]);

  const importPresetsFromJson = useCallback(
    async (file: File) => {
      const text = await file.text();
      const data = JSON.parse(text) as PresetExportData;
      if (!data.presets || !Array.isArray(data.presets)) {
        throw new Error('不正なプリセットJSONです');
      }
      setPresets((prev) => {
        const merged = [...prev];
        for (const preset of data.presets) {
          const existing = merged.findIndex((p) => p.name === preset.name);
          if (existing >= 0) {
            merged[existing] = preset;
          } else {
            merged.push(preset);
          }
        }
        return merged;
      });
    },
    []
  );

  return {
    presets,
    addPreset,
    deletePreset,
    exportPresetsToJson,
    importPresetsFromJson,
  };
}

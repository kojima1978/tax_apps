import { useState, useMemo, useCallback, useRef } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { EditableDocumentList } from '@/constants';
import { reorderDocuments, reorderCategories } from '@/utils/editableListUtils';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

export const useDragAndDrop = (
  documentList: EditableDocumentList,
  setDocumentList: SetDocumentList,
) => {
  // ドラッグ中のアイテム
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);

  // 最新値をrefで保持（DnDハンドラーの依存配列から除外し安定化するため）
  const documentListRef = useRef(documentList);
  documentListRef.current = documentList;
  const isDraggingCategoryRef = useRef(isDraggingCategory);
  isDraggingCategoryRef.current = isDraggingCategory;
  const activeCategoryIdRef = useRef(activeCategoryId);
  activeCategoryIdRef.current = activeCategoryId;

  // DnDセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = String(active.id);
    setActiveId(activeIdStr);

    if (activeIdStr.startsWith('category-')) {
      setIsDraggingCategory(true);
      setActiveCategoryId(null);
    } else {
      setIsDraggingCategory(false);
      for (const category of documentListRef.current) {
        const docIndex = category.documents.findIndex((d) => d.id === activeIdStr);
        if (docIndex !== -1) {
          setActiveCategoryId(category.id);
          break;
        }
      }
    }
  }, []);

  // ドラッグ終了
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      const draggingCategory = isDraggingCategoryRef.current;
      const catId = activeCategoryIdRef.current;

      if (draggingCategory && activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
        const activeCatId = activeIdStr.replace('category-', '');
        const overCatId = overIdStr.replace('category-', '');

        setDocumentList(prev => {
          const oldIndex = prev.findIndex((c) => c.id === activeCatId);
          const newIndex = prev.findIndex((c) => c.id === overCatId);
          if (oldIndex !== -1 && newIndex !== -1) {
            return reorderCategories(prev, oldIndex, newIndex);
          }
          return prev;
        });
      } else if (!draggingCategory && catId) {
        setDocumentList(prev => {
          const category = prev.find((c) => c.id === catId);
          if (category) {
            const oldIndex = category.documents.findIndex((d) => d.id === activeIdStr);
            const newIndex = category.documents.findIndex((d) => d.id === overIdStr);
            if (oldIndex !== -1 && newIndex !== -1) {
              return reorderDocuments(prev, catId, oldIndex, newIndex);
            }
          }
          return prev;
        });
      }
    }

    setActiveId(null);
    setActiveCategoryId(null);
    setIsDraggingCategory(false);
  }, [setDocumentList]);

  // ドラッグ中のアイテムを取得（メモ化）
  const activeDocument = useMemo(() => {
    if (!activeId || !activeCategoryId) return null;
    const category = documentList.find((c) => c.id === activeCategoryId);
    return category?.documents.find((d) => d.id === activeId) ?? null;
  }, [activeId, activeCategoryId, documentList]);

  const activeCategory = useMemo(() => {
    if (!activeId || !isDraggingCategory) return null;
    const categoryId = activeId.replace('category-', '');
    return documentList.find((c) => c.id === categoryId) ?? null;
  }, [activeId, isDraggingCategory, documentList]);

  return {
    sensors,
    activeId,
    isDraggingCategory,
    activeDocument,
    activeCategory,
    handleDragStart,
    handleDragEnd,
  };
};

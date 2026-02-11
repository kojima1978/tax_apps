import React from 'react';

export function handleInlineKeyDown(onEnter: () => void, onEscape: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onEnter();
    if (e.key === 'Escape') onEscape();
  };
}

import { createContext } from 'react';

/** 印刷用レンダリング中は input/select を素のテキストとして描く */
export const PrintRenderContext = createContext(false);

/**
 * Application Types
 * アプリケーション共通型定義
 */

export interface Application {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

/** API送信用（id, timestamps を除外） */
export type ApplicationInput = Pick<Application, 'title' | 'description' | 'url' | 'icon'>;

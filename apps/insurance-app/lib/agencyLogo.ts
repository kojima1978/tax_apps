// 代理店ロゴは data URL のまま SQLite に持つ。ファイル置き場を増やさずに済み、
// 既存のバックアップ・JSONエクスポート/インポートがそのまま使えるため。
// その代わり肥大化を防ぐ必要があるので、登録時にブラウザ側で縮小してから保存する。

export const LOGO_MAX_WIDTH = 600;
export const LOGO_MAX_HEIGHT = 200;
// base64 は元データの約4/3。400,000文字 ≒ 300KB
export const LOGO_MAX_DATA_URL_LENGTH = 400_000;
export const LOGO_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const LOGO_ACCEPT_ATTRIBUTE = LOGO_ALLOWED_MIME_TYPES.join(',');

const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidLogoDataUrl(value: string): boolean {
  return value.length <= LOGO_MAX_DATA_URL_LENGTH && LOGO_DATA_URL_PATTERN.test(value);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした'));
    image.src = dataUrl;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('画像を読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}

/**
 * 選択された画像ファイルを、印刷表紙に載せられるサイズの data URL に変換する。
 * 上限に収まらない場合は PNG → WebP(高品質) → WebP(低品質) の順に切り替える。
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!LOGO_ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('PNG / JPEG / WebP の画像を選択してください');
  }

  const originalDataUrl = await readAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  if (!image.width || !image.height) throw new Error('画像を読み込めませんでした');

  const scale = Math.min(1, LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height);
  if (scale >= 1 && isValidLogoDataUrl(originalDataUrl)) return originalDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を変換できませんでした');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // 透過を保てる形式のみ。JPEG は背景が黒く落ちるので使わない
  const candidates: Array<[string, number | undefined]> = [
    ['image/png', undefined],
    ['image/webp', 0.9],
    ['image/webp', 0.7],
  ];
  for (const [mimeType, quality] of candidates) {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    if (isValidLogoDataUrl(dataUrl)) return dataUrl;
  }

  throw new Error('画像が大きすぎます。より小さい画像を選択してください');
}

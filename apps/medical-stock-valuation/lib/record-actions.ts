/**
 * レコードの有効化・無効化・削除などの共通アクション
 */

type ActionType = 'activate' | 'deactivate' | 'delete';

interface ToastHandler {
  success: (message: string) => void;
  error: (message: string) => void;
}

interface RecordActionParams {
  id: string;
  action: ActionType;
  apiEndpoint: string;
  onSuccess?: () => void;
  toast?: ToastHandler;
}

export const ACTION_MESSAGES = {
  activate: {
    title: '有効化の確認',
    confirm: (name: string) => `${name}を有効化しますか？`,
    error: '有効化に失敗しました',
  },
  deactivate: {
    title: '無効化の確認',
    confirm: (name: string) => `${name}を無効化しますか？\n無効化すると画面表示から見えなくなります。`,
    error: '無効化に失敗しました',
  },
  delete: {
    title: '削除の確認',
    confirm: (name: string) => `${name}を完全に削除しますか？\nこの操作は取り消せません。`,
    error: '削除に失敗しました',
  },
};

/**
 * レコードに対するアクション（有効化・無効化・削除）を実行する共通関数
 * confirm() を除去し、呼び出し元で確認ダイアログを表示してから呼ぶ想定
 */
export async function executeRecordAction({
  id,
  action,
  apiEndpoint,
  onSuccess,
  toast,
}: RecordActionParams): Promise<boolean> {
  const messages = ACTION_MESSAGES[action];

  try {
    const response = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });

    if (!response.ok) throw new Error(messages.error);

    const result = await response.json();
    if (toast) {
      toast.success(result.message);
    }

    if (onSuccess) {
      onSuccess();
    }

    return true;
  } catch (error) {
    console.error(`${action}エラー:`, error);
    if (toast) {
      toast.error(messages.error);
    }
    return false;
  }
}

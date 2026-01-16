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
  name: string;
  action: ActionType;
  apiEndpoint: string;
  onSuccess?: () => void;
  toast?: ToastHandler;
}

const ACTION_MESSAGES = {
  activate: {
    confirm: (name: string) => `${name}を有効化しますか？`,
    error: '有効化に失敗しました',
  },
  deactivate: {
    confirm: (name: string) => `${name}を無効化しますか？\n無効化すると画面表示から見えなくなります。`,
    error: '無効化に失敗しました',
  },
  delete: {
    confirm: (name: string) => `${name}を完全に削除しますか？\nこの操作は取り消せません。`,
    error: '削除に失敗しました',
  },
};

/**
 * レコードに対するアクション（有効化・無効化・削除）を実行する共通関数
 */
export async function executeRecordAction({
  id,
  name,
  action,
  apiEndpoint,
  onSuccess,
  toast,
}: RecordActionParams): Promise<boolean> {
  const messages = ACTION_MESSAGES[action];

  if (!confirm(messages.confirm(name))) {
    return false;
  }

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

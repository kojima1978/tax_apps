import { ApiError } from "@/lib/api/client";

export type ErrorInfo = {
  message: string;
  code: string;
  status?: number;
  isNetworkError: boolean;
  isNotFound: boolean;
  isValidationError: boolean;
  isServerError: boolean;
};

export function parseError(error: unknown): ErrorInfo {
  // Network error (fetch failed)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      message: "ネットワークエラーが発生しました。接続を確認してください。",
      code: "NETWORK_ERROR",
      isNetworkError: true,
      isNotFound: false,
      isValidationError: false,
      isServerError: false,
    };
  }

  // API error
  if (error instanceof ApiError) {
    const isNotFound = error.status === 404;
    const isValidationError = error.status === 400;
    const isServerError = error.status >= 500;

    let message = error.message;

    // Translate common error codes to Japanese
    switch (error.code) {
      case "NOT_FOUND":
        message = "指定されたデータが見つかりません。";
        break;
      case "VALIDATION_ERROR":
        message = "入力データに問題があります。";
        break;
      case "INTERNAL_SERVER_ERROR":
        message = "サーバーでエラーが発生しました。しばらく後に再試行してください。";
        break;
    }

    return {
      message,
      code: error.code,
      status: error.status,
      isNetworkError: false,
      isNotFound,
      isValidationError,
      isServerError,
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message || "予期しないエラーが発生しました。",
      code: "UNKNOWN_ERROR",
      isNetworkError: false,
      isNotFound: false,
      isValidationError: false,
      isServerError: false,
    };
  }

  // Unknown
  return {
    message: "予期しないエラーが発生しました。",
    code: "UNKNOWN_ERROR",
    isNetworkError: false,
    isNotFound: false,
    isValidationError: false,
    isServerError: false,
  };
}

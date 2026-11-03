import { useEffect, useState, type ReactNode } from 'react';

type RetryImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

const MAX_RETRIES = 2;

const withRetryToken = (src: string, attempt: number): string => {
  if (attempt === 0) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}loadRetry=${attempt}`;
};

/** 一時的な通信失敗時は再読込し、恒久的な失敗時は壊れた画像ではなく代替表示へ切り替える。 */
export const RetryImage = ({ src, alt, className, fallback = null }: RetryImageProps) => {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setAttempt(0); }, [src]);

  if (attempt > MAX_RETRIES) return fallback;

  return (
    <img
      key={`${src}-${attempt}`}
      src={withRetryToken(src, attempt)}
      alt={alt}
      className={className}
      onError={() => setAttempt((current) => current + 1)}
    />
  );
};

import Link from 'next/link';
import { isExternalUrl } from '@/lib/url';

interface AppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function AppLink({ href, children, className }: AppLinkProps) {
  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

import type { Metadata } from 'next';
import HelpView from '@/components/HelpView';

export const metadata: Metadata = { title: '保険証券分析・診断｜使い方' };

export default function HelpPage() {
  return <HelpView />;
}

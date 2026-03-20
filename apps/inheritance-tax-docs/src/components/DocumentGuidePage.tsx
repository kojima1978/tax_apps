import type { PageConfig } from '../constants/pageConfig';
import { useDocumentGuide } from '../hooks/useDocumentGuide';
import { UnifiedDocumentView } from './UnifiedDocumentView';

interface DocumentGuidePageProps {
  pageConfig: PageConfig;
}

/** PageConfig を受け取り、hook → View を接続する汎用ラッパー */
export function DocumentGuidePage({ pageConfig }: DocumentGuidePageProps) {
  const guide = useDocumentGuide({
    categories: pageConfig.categories,
    appName: pageConfig.appName,
    filenamePrefix: pageConfig.filenamePrefix,
  });

  return <UnifiedDocumentView pageConfig={pageConfig} guide={guide} />;
}

import { Card } from "@/components/ui/Card";

interface CalculationProcessDisplayProps {
  comparableValue: number;
  netAssetPerShare: number;
  lRatio: number;
  size: string;
  isZeroElementCompany?: boolean;
  isOneElementCompany?: boolean;
  /** "（土地は時価＋法人税控除しない）" etc. appended to 純資産価額 labels */
  netAssetSuffix?: string;
  /**
   * "inheritance" shows Big/Medium/Small branches.
   * "corporate" always uses small company formula for non-zero/one.
   */
  variant: "inheritance" | "corporate";
}

export function CalculationProcessDisplay({
  comparableValue: S,
  netAssetPerShare: N,
  lRatio: L,
  size,
  isZeroElementCompany,
  isOneElementCompany,
  netAssetSuffix = "",
  variant,
}: CalculationProcessDisplayProps) {
  const netAssetLabel = `純資産価額${netAssetSuffix}`;

  const renderContent = () => {
    // 比準要素数0
    if (isZeroElementCompany) {
      return (
        <div className="space-y-2">
          <p className="font-semibold text-foreground">比準要素数0の会社</p>
          <p className="text-muted-foreground">{netAssetLabel}</p>
          <p className="text-foreground pl-4">{N.toLocaleString()}円</p>
        </div>
      );
    }

    // 比準要素数1
    if (isOneElementCompany) {
      const blended = Math.floor(S * 0.25 + N * 0.75);
      return (
        <div className="space-y-2">
          <p className="font-semibold text-foreground">比準要素数1の会社</p>
          <p className="text-muted-foreground">
            次のうちいずれか低い方の金額
          </p>
          <div className="pl-4 space-y-1">
            <p className="text-muted-foreground">
              イ　（類似業種比準価額 × 0.25）＋（純資産価額 × 0.75）
            </p>
            <p className="text-foreground pl-6">
              = ({S.toLocaleString()} × 0.25) + ({N.toLocaleString()} × 0.75)
            </p>
            <p className="text-foreground pl-6">= {blended.toLocaleString()}円</p>
            <p className="text-muted-foreground mt-2">ロ　{netAssetLabel}</p>
            <p className="text-foreground pl-6">= {N.toLocaleString()}円</p>
          </div>
        </div>
      );
    }

    // inheritance variant: Big/Medium/Small
    if (variant === "inheritance") {
      if (size === "Big") {
        return (
          <div className="space-y-2">
            <p className="font-semibold text-foreground">
              大会社の株式の価額
            </p>
            <p className="text-muted-foreground">
              次のうちいずれか低い方の金額
            </p>
            <div className="pl-4 space-y-1">
              <p className="text-muted-foreground">イ　類似業種比準価額</p>
              <p className="text-foreground pl-6">{S.toLocaleString()}円</p>
              <p className="text-muted-foreground mt-2">ロ　純資産価額</p>
              <p className="text-foreground pl-6">{N.toLocaleString()}円</p>
            </div>
          </div>
        );
      }

      if (size === "Medium") {
        const minValue = Math.min(S, N);
        const blended = Math.floor(minValue * L + N * (1 - L));
        return (
          <div className="space-y-2">
            <p className="font-semibold text-foreground">
              中会社の株式の価額 (L={L})
            </p>
            <p className="text-muted-foreground">
              （「類似業種比準価額」と「純資産価額」いずれか低い方）× L ＋
              純資産価額 × (1 - L)
            </p>
            <div className="pl-4 space-y-1 mt-2">
              <p className="text-muted-foreground">
                ({minValue.toLocaleString()} × {L}) ＋ ({N.toLocaleString()} ×{" "}
                {(1 - L).toFixed(2)})
              </p>
              <p className="text-foreground pl-6">
                = {blended.toLocaleString()}円
              </p>
            </div>
          </div>
        );
      }
    }

    // Small (inheritance) or all non-zero/one (corporate)
    const blended = Math.floor(S * 0.5 + N * 0.5);
    const title =
      variant === "corporate"
        ? "法人税法上の時価（小会社の株式の価額）"
        : "小会社の株式の価額";
    return (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-muted-foreground">
          次のうちいずれか低い方の金額
        </p>
        <div className="pl-4 space-y-1">
          <p className="text-muted-foreground">イ　{netAssetLabel}</p>
          <p className="text-foreground pl-6">{N.toLocaleString()}円</p>
          <p className="text-muted-foreground mt-2">
            ロ　（類似業種比準価額 × 0.50）＋（純資産価額 × 0.50）
          </p>
          <p className="text-foreground pl-6">
            = ({S.toLocaleString()} × 0.50) + ({N.toLocaleString()} × 0.50)
          </p>
          <p className="text-foreground pl-6">
            = {blended.toLocaleString()}円
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-1 md:col-span-2 p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/20">
      <div className="text-sm">{renderContent()}</div>
    </Card>
  );
}

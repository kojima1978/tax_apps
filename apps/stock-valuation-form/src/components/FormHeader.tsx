import { FormField } from '@/components/ui/FormField';

interface FormHeaderProps {
  title: string;
  getField: (field: string) => string;
  updateField: (field: string, value: string) => void;
  showCompanyOnly?: boolean;
}

export function FormHeader({
  title,
  getField,
  updateField,
  showCompanyOnly = false,
}: FormHeaderProps) {
  if (showCompanyOnly) {
    return (
      <div className="flex items-center justify-between gov-cell-b" style={{ minHeight: 22 }}>
        <div className="gov-title flex-1">{title}</div>
        <div className="flex items-center gap-1 pr-1">
          <span>会社名</span>
          <FormField
            value={getField('companyName')}
            onChange={(v) => updateField('companyName', v)}
            className="w-48"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* タイトル行 */}
      <div className="flex items-start">
        {/* 左側の縦書きヘッダー */}
        <div className="gov-side-header gov-cell-r" style={{ minHeight: 200, width: 22 }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        <div className="flex-1">
          {/* タイトル＋整理番号 */}
          <div className="flex items-center justify-between gov-cell-b" style={{ minHeight: 22 }}>
            <div className="gov-title flex-1">{title}</div>
            <div className="flex items-center gap-1 text-[9px]">
              <span>整理番号</span>
              <FormField
                value={getField('referenceNumber')}
                onChange={(v) => updateField('referenceNumber', v)}
                className="w-24"
              />
            </div>
          </div>

          {/* 会社情報 */}
          <div className="grid grid-cols-[1fr_1fr] gov-cell-b">
            {/* 左列 */}
            <div className="gov-cell-r">
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 70 }}>
                  会 社 名
                </span>
                <FormField
                  value={getField('companyName')}
                  onChange={(v) => updateField('companyName', v)}
                  className="flex-1 px-1"
                />
              </div>
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 70 }}>
                  本店の所在地
                </span>
                <FormField
                  value={getField('address')}
                  onChange={(v) => updateField('address', v)}
                  className="flex-1 px-1"
                />
              </div>
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 70 }}>
                  代表者氏名
                </span>
                <FormField
                  value={getField('representative')}
                  onChange={(v) => updateField('representative', v)}
                  className="flex-1 px-1"
                />
              </div>
              <div className="flex items-center" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 70 }}>
                  取扱品目及び製造、卸売、小売等の区分
                </span>
                <FormField
                  value={getField('businessDescription')}
                  onChange={(v) => updateField('businessDescription', v)}
                  className="flex-1 px-1"
                />
              </div>
            </div>

            {/* 右列 */}
            <div>
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 55 }}>
                  業種目
                </span>
                <FormField
                  value={getField('businessType')}
                  onChange={(v) => updateField('businessType', v)}
                  className="flex-1 px-1"
                />
                <span className="gov-header px-1 gov-cell-r shrink-0 ml-1" style={{ width: 55 }}>
                  番号
                </span>
                <FormField
                  value={getField('businessCode')}
                  onChange={(v) => updateField('businessCode', v)}
                  className="w-16 px-1"
                />
              </div>
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 55 }}>
                  課税時期
                </span>
                <span className="px-1">令和</span>
                <FormField
                  value={getField('taxYear')}
                  onChange={(v) => updateField('taxYear', v)}
                  className="w-6"
                  textAlign="center"
                />
                <span>年</span>
                <FormField
                  value={getField('taxMonth')}
                  onChange={(v) => updateField('taxMonth', v)}
                  className="w-6"
                  textAlign="center"
                />
                <span>月</span>
                <FormField
                  value={getField('taxDay')}
                  onChange={(v) => updateField('taxDay', v)}
                  className="w-6"
                  textAlign="center"
                />
                <span>日</span>
              </div>
              <div className="flex items-center gov-cell-b" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 55 }}>
                  直前期末
                </span>
                <span className="text-[9px] px-1">自</span>
                <FormField
                  value={getField('fiscalStart')}
                  onChange={(v) => updateField('fiscalStart', v)}
                  className="flex-1 px-1"
                  placeholder="年 月 日"
                />
                <span className="text-[9px] px-1">至</span>
                <FormField
                  value={getField('fiscalEnd')}
                  onChange={(v) => updateField('fiscalEnd', v)}
                  className="flex-1 px-1"
                  placeholder="年 月 日"
                />
              </div>
              <div className="flex items-center" style={{ minHeight: 20 }}>
                <span className="gov-header px-1 gov-cell-r shrink-0" style={{ width: 55 }}>
                  (電話)
                </span>
                <FormField
                  value={getField('phone')}
                  onChange={(v) => updateField('phone', v)}
                  className="flex-1 px-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

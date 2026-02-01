export type Contact = {
    name: string
    phone: string
    email: string
}

export type ProgressStep = {
    id: string
    name: string
    date: string | null
    memo?: string
    isDynamic?: boolean
}

export type InheritanceCase = {
    id: string
    deceasedName: string
    dateOfDeath: string
    status: "未着手" | "進行中" | "完了"
    taxAmount: number
    assignee: string
    feeAmount: number;
    fiscalYear: number;
    referrer?: string;
    estimateAmount?: number;
    propertyValue?: number;
    referralFeeRate?: number; // %
    referralFeeAmount?: number; // Amount
    contacts: Contact[];
    progress?: ProgressStep[];
    acceptanceStatus?: "受託可" | "受託不可" | "未判定";
}

export const mockData: InheritanceCase[] = [
    {
        "id": "1",
        "deceasedName": "鈴木 次郎",
        "dateOfDeath": "2029-03-04",
        "status": "進行中",
        "taxAmount": 54764887,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "税理士E",
        "estimateAmount": 5063339,
        "propertyValue": 476333925,
        "referralFeeRate": 10,
        "referralFeeAmount": 506333,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-03-31",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "2",
        "deceasedName": "小林 次郎",
        "dateOfDeath": "2018-03-07",
        "status": "完了",
        "taxAmount": 96675916,
        "assignee": "鈴木 一郎",
        "feeAmount": 3829174,
        "fiscalYear": 2018,
        "referrer": "知人紹介",
        "estimateAmount": 3840406,
        "propertyValue": 354040641,
        "referralFeeRate": 15,
        "referralFeeAmount": 574376,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-03-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "3",
        "deceasedName": "田中 三郎",
        "dateOfDeath": "2034-11-14",
        "status": "完了",
        "taxAmount": 55824062,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2034,
        "referrer": "葬儀社B",
        "estimateAmount": 0,
        "propertyValue": 353029900,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-12-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "4",
        "deceasedName": "伊藤 優子",
        "dateOfDeath": "2030-01-22",
        "status": "進行中",
        "taxAmount": 12502203,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2030,
        "referrer": "税理士E",
        "estimateAmount": 785132,
        "propertyValue": 48513262,
        "referralFeeRate": 15,
        "referralFeeAmount": 117769,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-01-24",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "5",
        "deceasedName": "伊藤 大輔",
        "dateOfDeath": "2031-10-30",
        "status": "進行中",
        "taxAmount": 95239687,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "estimateAmount": 4566869,
        "propertyValue": 426686947,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-11-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "6",
        "deceasedName": "中村 三郎",
        "dateOfDeath": "2029-07-15",
        "status": "完了",
        "taxAmount": 44500260,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "estimateAmount": 0,
        "propertyValue": 313426118,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-08-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "7",
        "deceasedName": "渡辺 三郎",
        "dateOfDeath": "2016-05-14",
        "status": "未着手",
        "taxAmount": 35825753,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "銀行C",
        "estimateAmount": 3852844,
        "propertyValue": 355284425,
        "referralFeeRate": 10,
        "referralFeeAmount": 385284,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-06-10",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "8",
        "deceasedName": "佐藤 太郎",
        "dateOfDeath": "2024-08-21",
        "status": "進行中",
        "taxAmount": 98775213,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "estimateAmount": 4735564,
        "propertyValue": 443556413,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-08-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "9",
        "deceasedName": "鈴木 三郎",
        "dateOfDeath": "2023-09-24",
        "status": "完了",
        "taxAmount": 27268425,
        "assignee": "高橋 三郎",
        "feeAmount": 2352842,
        "fiscalYear": 2023,
        "estimateAmount": 2342409,
        "propertyValue": 204240978,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-10-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "10",
        "deceasedName": "伊藤 優子",
        "dateOfDeath": "2022-04-30",
        "status": "進行中",
        "taxAmount": 85470982,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "税理士D",
        "estimateAmount": 3195782,
        "propertyValue": 289578261,
        "referralFeeRate": 10,
        "referralFeeAmount": 319578,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-05-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "11",
        "deceasedName": "山本 美咲",
        "dateOfDeath": "2021-01-31",
        "status": "完了",
        "taxAmount": 18640996,
        "assignee": "田中 次郎",
        "feeAmount": 1720036,
        "fiscalYear": 2021,
        "referrer": "税理士D",
        "estimateAmount": 1719243,
        "propertyValue": 141924369,
        "referralFeeRate": 20,
        "referralFeeAmount": 344007,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-02-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "12",
        "deceasedName": "鈴木 花子",
        "dateOfDeath": "2017-03-03",
        "status": "完了",
        "taxAmount": 53923875,
        "assignee": "田中 次郎",
        "feeAmount": 4341289,
        "fiscalYear": 2017,
        "referrer": "税理士E",
        "estimateAmount": 4330518,
        "propertyValue": 403051865,
        "referralFeeRate": 20,
        "referralFeeAmount": 868257,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2017-03-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "13",
        "deceasedName": "伊藤 花子",
        "dateOfDeath": "2030-11-07",
        "status": "完了",
        "taxAmount": 15574435,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2030,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 80611250,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-12-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "14",
        "deceasedName": "佐藤 太郎",
        "dateOfDeath": "2025-04-28",
        "status": "完了",
        "taxAmount": 80266711,
        "assignee": "鈴木 一郎",
        "feeAmount": 4739721,
        "fiscalYear": 2025,
        "estimateAmount": 4721540,
        "propertyValue": 442154016,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-04-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "15",
        "deceasedName": "小林 陽翔",
        "dateOfDeath": "2024-08-04",
        "status": "進行中",
        "taxAmount": 29476617,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "知人紹介",
        "estimateAmount": 1834627,
        "propertyValue": 153462726,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-09-02",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "16",
        "deceasedName": "山本 健太",
        "dateOfDeath": "2018-10-01",
        "status": "完了",
        "taxAmount": 8011224,
        "assignee": "田中 次郎",
        "feeAmount": 745286,
        "fiscalYear": 2018,
        "estimateAmount": 723227,
        "propertyValue": 42322748,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-10-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "17",
        "deceasedName": "山本 次郎",
        "dateOfDeath": "2035-08-17",
        "status": "未着手",
        "taxAmount": 49589068,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "保険会社F",
        "estimateAmount": 0,
        "propertyValue": 271080181,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-08-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "18",
        "deceasedName": "中村 三郎",
        "dateOfDeath": "2026-11-22",
        "status": "完了",
        "taxAmount": 28129198,
        "assignee": "田中 次郎",
        "feeAmount": 1898127,
        "fiscalYear": 2026,
        "referrer": "知人紹介",
        "estimateAmount": 1915860,
        "propertyValue": 161586073,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-12-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "19",
        "deceasedName": "山本 一郎",
        "dateOfDeath": "2023-08-01",
        "status": "進行中",
        "taxAmount": 3712400,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "estimateAmount": 605279,
        "propertyValue": 30527906,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-08-14",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "20",
        "deceasedName": "高橋 蓮",
        "dateOfDeath": "2031-03-06",
        "status": "完了",
        "taxAmount": 9120400,
        "assignee": "鈴木 一郎",
        "feeAmount": 886543,
        "fiscalYear": 2031,
        "estimateAmount": 879567,
        "propertyValue": 57956778,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-03-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "21",
        "deceasedName": "山本 大輔",
        "dateOfDeath": "2034-11-16",
        "status": "進行中",
        "taxAmount": 56971060,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2034,
        "referrer": "葬儀社B",
        "estimateAmount": 2687277,
        "propertyValue": 238727709,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-12-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "22",
        "deceasedName": "高橋 一郎",
        "dateOfDeath": "2022-01-25",
        "status": "未着手",
        "taxAmount": 43385518,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "葬儀社A",
        "estimateAmount": 0,
        "propertyValue": 197960562,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-02-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "23",
        "deceasedName": "渡辺 一郎",
        "dateOfDeath": "2018-03-14",
        "status": "未着手",
        "taxAmount": 100686618,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "estimateAmount": 3904586,
        "propertyValue": 360458645,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-03-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "24",
        "deceasedName": "中村 次郎",
        "dateOfDeath": "2032-04-02",
        "status": "未着手",
        "taxAmount": 14358977,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "estimateAmount": 0,
        "propertyValue": 115513937,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-04-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "25",
        "deceasedName": "伊藤 美咲",
        "dateOfDeath": "2034-05-08",
        "status": "未着手",
        "taxAmount": 46197062,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2034,
        "referrer": "知人紹介",
        "estimateAmount": 0,
        "propertyValue": 380186090,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-06-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "26",
        "deceasedName": "加藤 一郎",
        "dateOfDeath": "2031-08-18",
        "status": "進行中",
        "taxAmount": 28183600,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "estimateAmount": 2029551,
        "propertyValue": 172955114,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-09-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "27",
        "deceasedName": "中村 優子",
        "dateOfDeath": "2018-12-17",
        "status": "完了",
        "taxAmount": 36114148,
        "assignee": "高橋 三郎",
        "feeAmount": 2873652,
        "fiscalYear": 2018,
        "referrer": "知人紹介",
        "estimateAmount": 2881085,
        "propertyValue": 258108586,
        "referralFeeRate": 15,
        "referralFeeAmount": 431047,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-12-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "28",
        "deceasedName": "渡辺 大輔",
        "dateOfDeath": "2035-08-07",
        "status": "未着手",
        "taxAmount": 26844607,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "葬儀社B",
        "estimateAmount": 1904206,
        "propertyValue": 160420676,
        "referralFeeRate": 20,
        "referralFeeAmount": 380841,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-08-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "29",
        "deceasedName": "佐藤 太郎",
        "dateOfDeath": "2029-01-02",
        "status": "未着手",
        "taxAmount": 56125073,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "葬儀社A",
        "estimateAmount": 3109237,
        "propertyValue": 280923797,
        "referralFeeRate": 15,
        "referralFeeAmount": 466385,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-01-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "30",
        "deceasedName": "山本 蓮",
        "dateOfDeath": "2025-01-26",
        "status": "未着手",
        "taxAmount": 100588273,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "保険会社F",
        "estimateAmount": 4153817,
        "propertyValue": 385381753,
        "referralFeeRate": 20,
        "referralFeeAmount": 830763,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-02-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "31",
        "deceasedName": "高橋 結衣",
        "dateOfDeath": "2020-06-18",
        "status": "未着手",
        "taxAmount": 36895516,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2020,
        "estimateAmount": 0,
        "propertyValue": 155052562,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2020-07-09",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "32",
        "deceasedName": "鈴木 優子",
        "dateOfDeath": "2027-03-13",
        "status": "未着手",
        "taxAmount": 42746753,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "葬儀社B",
        "estimateAmount": 2483294,
        "propertyValue": 218329412,
        "referralFeeRate": 20,
        "referralFeeAmount": 496658,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-03-27",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "33",
        "deceasedName": "中村 一郎",
        "dateOfDeath": "2033-04-26",
        "status": "未着手",
        "taxAmount": 53794796,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "referrer": "銀行B",
        "estimateAmount": 2617830,
        "propertyValue": 231783046,
        "referralFeeRate": 15,
        "referralFeeAmount": 392674,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-05-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "34",
        "deceasedName": "鈴木 結衣",
        "dateOfDeath": "2016-08-30",
        "status": "完了",
        "taxAmount": 32442924,
        "assignee": "田中 次郎",
        "feeAmount": 2715836,
        "fiscalYear": 2016,
        "referrer": "葬儀社B",
        "estimateAmount": 2732440,
        "propertyValue": 243244050,
        "referralFeeRate": 15,
        "referralFeeAmount": 407375,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-09-16",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "35",
        "deceasedName": "小林 蓮",
        "dateOfDeath": "2022-06-06",
        "status": "未着手",
        "taxAmount": 93735879,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "葬儀社B",
        "estimateAmount": 3977651,
        "propertyValue": 367765191,
        "referralFeeRate": 10,
        "referralFeeAmount": 397765,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-06-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "36",
        "deceasedName": "渡辺 花子",
        "dateOfDeath": "2020-10-06",
        "status": "完了",
        "taxAmount": 24512735,
        "assignee": "田中 次郎",
        "feeAmount": 1744569,
        "fiscalYear": 2020,
        "estimateAmount": 1730618,
        "propertyValue": 143061802,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2020-10-15",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "37",
        "deceasedName": "加藤 結衣",
        "dateOfDeath": "2017-04-17",
        "status": "完了",
        "taxAmount": 44873253,
        "assignee": "高橋 三郎",
        "feeAmount": 2284879,
        "fiscalYear": 2017,
        "referrer": "税理士E",
        "estimateAmount": 2270146,
        "propertyValue": 197014681,
        "referralFeeRate": 15,
        "referralFeeAmount": 342731,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2017-05-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "38",
        "deceasedName": "小林 健太",
        "dateOfDeath": "2025-09-12",
        "status": "進行中",
        "taxAmount": 96289214,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "葬儀社A",
        "estimateAmount": 5146036,
        "propertyValue": 484603687,
        "referralFeeRate": 20,
        "referralFeeAmount": 1029207,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-09-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "39",
        "deceasedName": "佐藤 陽翔",
        "dateOfDeath": "2016-05-16",
        "status": "進行中",
        "taxAmount": 64445700,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "税理士E",
        "estimateAmount": 3250546,
        "propertyValue": 295054680,
        "referralFeeRate": 10,
        "referralFeeAmount": 325054,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-05-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "40",
        "deceasedName": "小林 大輔",
        "dateOfDeath": "2021-05-23",
        "status": "未着手",
        "taxAmount": 10245578,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "税理士E",
        "estimateAmount": 0,
        "propertyValue": 89198252,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-05-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "41",
        "deceasedName": "佐藤 太郎",
        "dateOfDeath": "2030-04-22",
        "status": "未着手",
        "taxAmount": 22523367,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2030,
        "estimateAmount": 0,
        "propertyValue": 162010972,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-05-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "42",
        "deceasedName": "山本 太郎",
        "dateOfDeath": "2018-05-22",
        "status": "完了",
        "taxAmount": 68293666,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "referrer": "銀行C",
        "estimateAmount": 0,
        "propertyValue": 255900894,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-06-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "43",
        "deceasedName": "佐藤 次郎",
        "dateOfDeath": "2022-02-16",
        "status": "完了",
        "taxAmount": 74407231,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "葬儀社B",
        "estimateAmount": 0,
        "propertyValue": 305287757,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-02-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "44",
        "deceasedName": "高橋 三郎",
        "dateOfDeath": "2026-11-16",
        "status": "未着手",
        "taxAmount": 59395001,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "知人紹介",
        "estimateAmount": 2315529,
        "propertyValue": 201552902,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-11-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "45",
        "deceasedName": "伊藤 大輔",
        "dateOfDeath": "2024-10-04",
        "status": "進行中",
        "taxAmount": 18335549,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "税理士E",
        "estimateAmount": 1699013,
        "propertyValue": 139901381,
        "referralFeeRate": 10,
        "referralFeeAmount": 169901,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-10-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "46",
        "deceasedName": "高橋 優子",
        "dateOfDeath": "2028-08-22",
        "status": "完了",
        "taxAmount": 104900671,
        "assignee": "田中 次郎",
        "feeAmount": 3906114,
        "fiscalYear": 2028,
        "referrer": "税理士D",
        "estimateAmount": 3905092,
        "propertyValue": 360509281,
        "referralFeeRate": 15,
        "referralFeeAmount": 585917,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-09-14",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "47",
        "deceasedName": "田中 三郎",
        "dateOfDeath": "2024-12-18",
        "status": "完了",
        "taxAmount": 66960519,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "保険会社F",
        "estimateAmount": 0,
        "propertyValue": 250673083,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-12-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "48",
        "deceasedName": "小林 健太",
        "dateOfDeath": "2027-12-01",
        "status": "未着手",
        "taxAmount": 28620097,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "estimateAmount": 0,
        "propertyValue": 225169399,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-12-16",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "49",
        "deceasedName": "田中 結衣",
        "dateOfDeath": "2019-10-25",
        "status": "未着手",
        "taxAmount": 21559881,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 195776364,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-10-31",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "50",
        "deceasedName": "渡辺 次郎",
        "dateOfDeath": "2031-11-06",
        "status": "未着手",
        "taxAmount": 38578552,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "referrer": "税理士D",
        "estimateAmount": 3657442,
        "propertyValue": 335744242,
        "referralFeeRate": 15,
        "referralFeeAmount": 548616,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-12-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "51",
        "deceasedName": "中村 太郎",
        "dateOfDeath": "2021-12-12",
        "status": "未着手",
        "taxAmount": 92265404,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "銀行A",
        "estimateAmount": 3780458,
        "propertyValue": 348045837,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-12-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "52",
        "deceasedName": "加藤 健太",
        "dateOfDeath": "2030-12-23",
        "status": "完了",
        "taxAmount": 106809685,
        "assignee": "鈴木 一郎",
        "feeAmount": 5319575,
        "fiscalYear": 2030,
        "referrer": "葬儀社A",
        "estimateAmount": 5299748,
        "propertyValue": 499974897,
        "referralFeeRate": 15,
        "referralFeeAmount": 797936,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-01-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "53",
        "deceasedName": "伊藤 次郎",
        "dateOfDeath": "2029-01-03",
        "status": "完了",
        "taxAmount": 44531195,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "estimateAmount": 0,
        "propertyValue": 444245615,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-01-23",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "54",
        "deceasedName": "山本 花子",
        "dateOfDeath": "2026-06-04",
        "status": "未着手",
        "taxAmount": 98095136,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "estimateAmount": 5085297,
        "propertyValue": 478529768,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-06-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "55",
        "deceasedName": "中村 美咲",
        "dateOfDeath": "2033-08-23",
        "status": "未着手",
        "taxAmount": 36202824,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "referrer": "銀行C",
        "estimateAmount": 3366366,
        "propertyValue": 306636641,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-08-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "56",
        "deceasedName": "鈴木 結衣",
        "dateOfDeath": "2028-08-28",
        "status": "未着手",
        "taxAmount": 11634286,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2028,
        "estimateAmount": 953459,
        "propertyValue": 65345912,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-09-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "57",
        "deceasedName": "渡辺 健太",
        "dateOfDeath": "2030-10-30",
        "status": "未着手",
        "taxAmount": 42196037,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2030,
        "referrer": "知人紹介",
        "estimateAmount": 0,
        "propertyValue": 147562592,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-11-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "58",
        "deceasedName": "鈴木 大輔",
        "dateOfDeath": "2031-06-01",
        "status": "進行中",
        "taxAmount": 121600238,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "estimateAmount": 5150854,
        "propertyValue": 485085493,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-06-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "59",
        "deceasedName": "高橋 健太",
        "dateOfDeath": "2019-01-04",
        "status": "進行中",
        "taxAmount": 19718961,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "税理士E",
        "estimateAmount": 1484872,
        "propertyValue": 118487210,
        "referralFeeRate": 10,
        "referralFeeAmount": 148487,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-01-23",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "60",
        "deceasedName": "田中 健太",
        "dateOfDeath": "2019-09-22",
        "status": "完了",
        "taxAmount": 126989366,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "葬儀社B",
        "estimateAmount": 0,
        "propertyValue": 439699748,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-09-23",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "61",
        "deceasedName": "高橋 蓮",
        "dateOfDeath": "2016-09-24",
        "status": "進行中",
        "taxAmount": 121358159,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "保険会社F",
        "estimateAmount": 4473838,
        "propertyValue": 417383885,
        "referralFeeRate": 10,
        "referralFeeAmount": 447383,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-09-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "62",
        "deceasedName": "加藤 三郎",
        "dateOfDeath": "2026-06-28",
        "status": "未着手",
        "taxAmount": 19692074,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "保険会社F",
        "estimateAmount": 0,
        "propertyValue": 73292982,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-07-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "63",
        "deceasedName": "鈴木 次郎",
        "dateOfDeath": "2021-07-28",
        "status": "完了",
        "taxAmount": 23185041,
        "assignee": "田中 次郎",
        "feeAmount": 1619066,
        "fiscalYear": 2021,
        "estimateAmount": 1607937,
        "propertyValue": 130793784,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-08-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "64",
        "deceasedName": "小林 美咲",
        "dateOfDeath": "2026-11-05",
        "status": "未着手",
        "taxAmount": 6576062,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "知人紹介",
        "estimateAmount": 856625,
        "propertyValue": 55662516,
        "referralFeeRate": 15,
        "referralFeeAmount": 128493,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-12-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "65",
        "deceasedName": "高橋 結衣",
        "dateOfDeath": "2028-03-22",
        "status": "完了",
        "taxAmount": 2827466,
        "assignee": "田中 次郎",
        "feeAmount": 539670,
        "fiscalYear": 2028,
        "referrer": "葬儀社A",
        "estimateAmount": 560791,
        "propertyValue": 26079134,
        "referralFeeRate": 15,
        "referralFeeAmount": 80950,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-04-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "66",
        "deceasedName": "中村 健太",
        "dateOfDeath": "2025-05-23",
        "status": "未着手",
        "taxAmount": 16616813,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "税理士D",
        "estimateAmount": 894224,
        "propertyValue": 59422449,
        "referralFeeRate": 10,
        "referralFeeAmount": 89422,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-06-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "67",
        "deceasedName": "伊藤 健太",
        "dateOfDeath": "2022-06-19",
        "status": "進行中",
        "taxAmount": 85772902,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "葬儀社B",
        "estimateAmount": 4942730,
        "propertyValue": 464273002,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-06-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "68",
        "deceasedName": "高橋 蓮",
        "dateOfDeath": "2023-05-23",
        "status": "未着手",
        "taxAmount": 30893763,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "referrer": "税理士E",
        "estimateAmount": 0,
        "propertyValue": 194060716,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-05-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "69",
        "deceasedName": "佐藤 蓮",
        "dateOfDeath": "2033-07-05",
        "status": "進行中",
        "taxAmount": 16978183,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "referrer": "銀行B",
        "estimateAmount": 1073765,
        "propertyValue": 77376521,
        "referralFeeRate": 10,
        "referralFeeAmount": 107376,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-07-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "70",
        "deceasedName": "佐藤 優子",
        "dateOfDeath": "2021-11-15",
        "status": "未着手",
        "taxAmount": 44607313,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "estimateAmount": 2380927,
        "propertyValue": 208092733,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-11-19",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "71",
        "deceasedName": "渡辺 次郎",
        "dateOfDeath": "2035-08-26",
        "status": "進行中",
        "taxAmount": 61694319,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "知人紹介",
        "estimateAmount": 2554387,
        "propertyValue": 225438736,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-09-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "72",
        "deceasedName": "高橋 結衣",
        "dateOfDeath": "2025-05-23",
        "status": "進行中",
        "taxAmount": 50099662,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "銀行A",
        "estimateAmount": 2798108,
        "propertyValue": 249810826,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-05-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "73",
        "deceasedName": "高橋 大輔",
        "dateOfDeath": "2025-06-22",
        "status": "完了",
        "taxAmount": 70902990,
        "assignee": "田中 次郎",
        "feeAmount": 3701112,
        "fiscalYear": 2025,
        "referrer": "税理士D",
        "estimateAmount": 3725115,
        "propertyValue": 342511583,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-07-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "74",
        "deceasedName": "小林 太郎",
        "dateOfDeath": "2029-06-05",
        "status": "進行中",
        "taxAmount": 55181313,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "税理士D",
        "estimateAmount": 4801625,
        "propertyValue": 450162511,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-06-23",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "75",
        "deceasedName": "小林 太郎",
        "dateOfDeath": "2015-01-29",
        "status": "未着手",
        "taxAmount": 26548088,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "税理士D",
        "estimateAmount": 1905493,
        "propertyValue": 160549302,
        "referralFeeRate": 15,
        "referralFeeAmount": 285823,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-02-01",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "76",
        "deceasedName": "伊藤 次郎",
        "dateOfDeath": "2018-08-14",
        "status": "未着手",
        "taxAmount": 33551004,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "referrer": "知人紹介",
        "estimateAmount": 2283571,
        "propertyValue": 198357148,
        "referralFeeRate": 15,
        "referralFeeAmount": 342535,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-09-02",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "77",
        "deceasedName": "鈴木 一郎",
        "dateOfDeath": "2033-04-19",
        "status": "未着手",
        "taxAmount": 74392671,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "estimateAmount": 0,
        "propertyValue": 248811216,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-05-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "78",
        "deceasedName": "山本 一郎",
        "dateOfDeath": "2027-11-18",
        "status": "完了",
        "taxAmount": 4636097,
        "assignee": "田中 次郎",
        "feeAmount": 518680,
        "fiscalYear": 2027,
        "estimateAmount": 528936,
        "propertyValue": 22893623,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-12-16",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "79",
        "deceasedName": "伊藤 健太",
        "dateOfDeath": "2035-07-01",
        "status": "未着手",
        "taxAmount": 2975687,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "銀行A",
        "estimateAmount": 590236,
        "propertyValue": 29023697,
        "referralFeeRate": 20,
        "referralFeeAmount": 118047,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-07-11",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "80",
        "deceasedName": "中村 結衣",
        "dateOfDeath": "2021-04-27",
        "status": "進行中",
        "taxAmount": 12214953,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "葬儀社A",
        "estimateAmount": 714686,
        "propertyValue": 41468638,
        "referralFeeRate": 15,
        "referralFeeAmount": 107202,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-04-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "81",
        "deceasedName": "中村 次郎",
        "dateOfDeath": "2018-01-04",
        "status": "未着手",
        "taxAmount": 3987259,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "estimateAmount": 509325,
        "propertyValue": 20932573,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-01-31",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "82",
        "deceasedName": "小林 健太",
        "dateOfDeath": "2015-12-29",
        "status": "完了",
        "taxAmount": 59762371,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 214375268,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-01-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "83",
        "deceasedName": "山本 一郎",
        "dateOfDeath": "2016-01-04",
        "status": "進行中",
        "taxAmount": 5937567,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "銀行B",
        "estimateAmount": 627754,
        "propertyValue": 32775454,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-01-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "84",
        "deceasedName": "渡辺 健太",
        "dateOfDeath": "2027-03-24",
        "status": "進行中",
        "taxAmount": 48018019,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "保険会社F",
        "estimateAmount": 3364374,
        "propertyValue": 306437415,
        "referralFeeRate": 10,
        "referralFeeAmount": 336437,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-04-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "85",
        "deceasedName": "鈴木 結衣",
        "dateOfDeath": "2032-06-11",
        "status": "完了",
        "taxAmount": 63319029,
        "assignee": "高橋 三郎",
        "feeAmount": 4332022,
        "fiscalYear": 2032,
        "estimateAmount": 4339727,
        "propertyValue": 403972759,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-06-27",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "86",
        "deceasedName": "中村 美咲",
        "dateOfDeath": "2023-07-12",
        "status": "進行中",
        "taxAmount": 55338469,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "referrer": "銀行B",
        "estimateAmount": 3922901,
        "propertyValue": 362290175,
        "referralFeeRate": 15,
        "referralFeeAmount": 588435,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-07-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "87",
        "deceasedName": "中村 健太",
        "dateOfDeath": "2015-10-10",
        "status": "完了",
        "taxAmount": 9211530,
        "assignee": "田中 次郎",
        "feeAmount": 691243,
        "fiscalYear": 2015,
        "estimateAmount": 687064,
        "propertyValue": 38706449,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-11-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "88",
        "deceasedName": "高橋 太郎",
        "dateOfDeath": "2030-11-22",
        "status": "未着手",
        "taxAmount": 57346711,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2030,
        "estimateAmount": 5206867,
        "propertyValue": 490686780,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-11-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "89",
        "deceasedName": "鈴木 陽翔",
        "dateOfDeath": "2025-01-20",
        "status": "未着手",
        "taxAmount": 52627076,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "葬儀社B",
        "estimateAmount": 0,
        "propertyValue": 300578369,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-02-02",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "90",
        "deceasedName": "加藤 太郎",
        "dateOfDeath": "2031-02-20",
        "status": "未着手",
        "taxAmount": 56399853,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "estimateAmount": 2315099,
        "propertyValue": 201509905,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-03-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "91",
        "deceasedName": "田中 次郎",
        "dateOfDeath": "2029-08-12",
        "status": "完了",
        "taxAmount": 46455639,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "葬儀社A",
        "estimateAmount": 0,
        "propertyValue": 234342513,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-09-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "92",
        "deceasedName": "渡辺 大輔",
        "dateOfDeath": "2027-09-22",
        "status": "完了",
        "taxAmount": 57003194,
        "assignee": "高橋 三郎",
        "feeAmount": 2260411,
        "fiscalYear": 2027,
        "estimateAmount": 2269372,
        "propertyValue": 196937289,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-10-19",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "93",
        "deceasedName": "佐藤 結衣",
        "dateOfDeath": "2025-06-13",
        "status": "完了",
        "taxAmount": 41325082,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "estimateAmount": 0,
        "propertyValue": 156035477,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-06-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "94",
        "deceasedName": "鈴木 健太",
        "dateOfDeath": "2026-03-12",
        "status": "完了",
        "taxAmount": 32201484,
        "assignee": "高橋 三郎",
        "feeAmount": 3282499,
        "fiscalYear": 2026,
        "referrer": "税理士D",
        "estimateAmount": 3276627,
        "propertyValue": 297662783,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-03-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "95",
        "deceasedName": "鈴木 一郎",
        "dateOfDeath": "2032-11-14",
        "status": "完了",
        "taxAmount": 70014828,
        "assignee": "高橋 三郎",
        "feeAmount": 2786859,
        "fiscalYear": 2032,
        "estimateAmount": 2799333,
        "propertyValue": 249933376,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-12-09",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "96",
        "deceasedName": "伊藤 優子",
        "dateOfDeath": "2032-03-28",
        "status": "完了",
        "taxAmount": 23516541,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 83941415,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-04-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "97",
        "deceasedName": "田中 三郎",
        "dateOfDeath": "2026-05-17",
        "status": "未着手",
        "taxAmount": 56686474,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "葬儀社A",
        "estimateAmount": 4915063,
        "propertyValue": 461506328,
        "referralFeeRate": 10,
        "referralFeeAmount": 491506,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-05-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "98",
        "deceasedName": "佐藤 蓮",
        "dateOfDeath": "2033-10-06",
        "status": "未着手",
        "taxAmount": 30763177,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "estimateAmount": 3359024,
        "propertyValue": 305902408,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-10-10",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "99",
        "deceasedName": "小林 三郎",
        "dateOfDeath": "2029-03-02",
        "status": "進行中",
        "taxAmount": 23969577,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "銀行A",
        "estimateAmount": 1609121,
        "propertyValue": 130912106,
        "referralFeeRate": 20,
        "referralFeeAmount": 321824,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-03-11",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "100",
        "deceasedName": "小林 次郎",
        "dateOfDeath": "2027-05-17",
        "status": "未着手",
        "taxAmount": 53078420,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "保険会社F",
        "estimateAmount": 0,
        "propertyValue": 343623873,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-05-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "101",
        "deceasedName": "渡辺 健太",
        "dateOfDeath": "2025-09-26",
        "status": "完了",
        "taxAmount": 85283296,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "知人紹介",
        "estimateAmount": 0,
        "propertyValue": 494996517,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-09-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "102",
        "deceasedName": "田中 一郎",
        "dateOfDeath": "2019-08-18",
        "status": "完了",
        "taxAmount": 54724943,
        "assignee": "田中 次郎",
        "feeAmount": 2804003,
        "fiscalYear": 2019,
        "referrer": "保険会社F",
        "estimateAmount": 2799212,
        "propertyValue": 249921213,
        "referralFeeRate": 20,
        "referralFeeAmount": 560800,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-09-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "103",
        "deceasedName": "小林 優子",
        "dateOfDeath": "2026-10-14",
        "status": "完了",
        "taxAmount": 20762579,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 96439055,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-10-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "104",
        "deceasedName": "渡辺 三郎",
        "dateOfDeath": "2021-10-13",
        "status": "完了",
        "taxAmount": 104673866,
        "assignee": "高橋 三郎",
        "feeAmount": 4885617,
        "fiscalYear": 2021,
        "referrer": "葬儀社A",
        "estimateAmount": 4881039,
        "propertyValue": 458103943,
        "referralFeeRate": 15,
        "referralFeeAmount": 732842,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-10-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "105",
        "deceasedName": "伊藤 三郎",
        "dateOfDeath": "2032-08-24",
        "status": "未着手",
        "taxAmount": 65752183,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "referrer": "税理士E",
        "estimateAmount": 4275964,
        "propertyValue": 397596447,
        "referralFeeRate": 10,
        "referralFeeAmount": 427596,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-08-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "106",
        "deceasedName": "中村 大輔",
        "dateOfDeath": "2033-05-08",
        "status": "完了",
        "taxAmount": 35780535,
        "assignee": "鈴木 一郎",
        "feeAmount": 1864810,
        "fiscalYear": 2033,
        "referrer": "知人紹介",
        "estimateAmount": 1858446,
        "propertyValue": 155844652,
        "referralFeeRate": 15,
        "referralFeeAmount": 279721,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-05-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "107",
        "deceasedName": "高橋 陽翔",
        "dateOfDeath": "2016-03-19",
        "status": "完了",
        "taxAmount": 107342105,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "estimateAmount": 0,
        "propertyValue": 433109612,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-04-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "108",
        "deceasedName": "山本 大輔",
        "dateOfDeath": "2032-09-16",
        "status": "完了",
        "taxAmount": 107509231,
        "assignee": "田中 次郎",
        "feeAmount": 4708767,
        "fiscalYear": 2032,
        "referrer": "知人紹介",
        "estimateAmount": 4698180,
        "propertyValue": 439818050,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-10-09",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "109",
        "deceasedName": "小林 陽翔",
        "dateOfDeath": "2019-04-10",
        "status": "完了",
        "taxAmount": 137792231,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 497735853,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-04-27",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "110",
        "deceasedName": "伊藤 三郎",
        "dateOfDeath": "2015-05-18",
        "status": "完了",
        "taxAmount": 18465748,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "葬儀社B",
        "estimateAmount": 0,
        "propertyValue": 150627643,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-06-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "111",
        "deceasedName": "鈴木 健太",
        "dateOfDeath": "2032-06-30",
        "status": "完了",
        "taxAmount": 18788001,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 108235734,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-07-01",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "112",
        "deceasedName": "伊藤 太郎",
        "dateOfDeath": "2016-05-15",
        "status": "未着手",
        "taxAmount": 122343148,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "estimateAmount": 4735718,
        "propertyValue": 443571878,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-05-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "113",
        "deceasedName": "中村 花子",
        "dateOfDeath": "2019-01-17",
        "status": "未着手",
        "taxAmount": 75547963,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "税理士D",
        "estimateAmount": 3419680,
        "propertyValue": 311968076,
        "referralFeeRate": 20,
        "referralFeeAmount": 683936,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-01-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "114",
        "deceasedName": "鈴木 花子",
        "dateOfDeath": "2027-05-02",
        "status": "完了",
        "taxAmount": 56902924,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "estimateAmount": 0,
        "propertyValue": 270627452,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-05-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "115",
        "deceasedName": "中村 次郎",
        "dateOfDeath": "2019-01-25",
        "status": "完了",
        "taxAmount": 45167344,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "estimateAmount": 0,
        "propertyValue": 308100664,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-02-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "116",
        "deceasedName": "伊藤 陽翔",
        "dateOfDeath": "2025-05-13",
        "status": "未着手",
        "taxAmount": 107363209,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "税理士D",
        "estimateAmount": 3896284,
        "propertyValue": 359628411,
        "referralFeeRate": 15,
        "referralFeeAmount": 584442,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-06-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "117",
        "deceasedName": "佐藤 三郎",
        "dateOfDeath": "2030-09-01",
        "status": "完了",
        "taxAmount": 47822618,
        "assignee": "田中 次郎",
        "feeAmount": 2379427,
        "fiscalYear": 2030,
        "referrer": "銀行C",
        "estimateAmount": 2382823,
        "propertyValue": 208282359,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2030-09-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "118",
        "deceasedName": "渡辺 蓮",
        "dateOfDeath": "2028-05-14",
        "status": "完了",
        "taxAmount": 50587644,
        "assignee": "鈴木 一郎",
        "feeAmount": 2677408,
        "fiscalYear": 2028,
        "referrer": "税理士D",
        "estimateAmount": 2661160,
        "propertyValue": 236116086,
        "referralFeeRate": 10,
        "referralFeeAmount": 267740,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-05-31",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "119",
        "deceasedName": "鈴木 結衣",
        "dateOfDeath": "2033-02-25",
        "status": "完了",
        "taxAmount": 84210666,
        "assignee": "高橋 三郎",
        "feeAmount": 4128976,
        "fiscalYear": 2033,
        "estimateAmount": 4123959,
        "propertyValue": 382395997,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-03-19",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "120",
        "deceasedName": "小林 美咲",
        "dateOfDeath": "2034-01-03",
        "status": "未着手",
        "taxAmount": 108852241,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2034,
        "referrer": "税理士D",
        "estimateAmount": 4473856,
        "propertyValue": 417385615,
        "referralFeeRate": 10,
        "referralFeeAmount": 447385,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-01-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "121",
        "deceasedName": "中村 次郎",
        "dateOfDeath": "2018-07-29",
        "status": "完了",
        "taxAmount": 59161087,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 204458472,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-08-15",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "122",
        "deceasedName": "渡辺 太郎",
        "dateOfDeath": "2027-06-25",
        "status": "完了",
        "taxAmount": 96449712,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 418830305,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-07-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "123",
        "deceasedName": "田中 蓮",
        "dateOfDeath": "2018-01-21",
        "status": "未着手",
        "taxAmount": 30727330,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "referrer": "税理士E",
        "estimateAmount": 1580901,
        "propertyValue": 128090134,
        "referralFeeRate": 10,
        "referralFeeAmount": 158090,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-02-14",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "124",
        "deceasedName": "山本 大輔",
        "dateOfDeath": "2024-05-19",
        "status": "未着手",
        "taxAmount": 47540548,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "銀行C",
        "estimateAmount": 3235692,
        "propertyValue": 293569291,
        "referralFeeRate": 20,
        "referralFeeAmount": 647138,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-06-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "125",
        "deceasedName": "山本 健太",
        "dateOfDeath": "2017-05-01",
        "status": "完了",
        "taxAmount": 112297334,
        "assignee": "鈴木 一郎",
        "feeAmount": 4405893,
        "fiscalYear": 2017,
        "estimateAmount": 4402963,
        "propertyValue": 410296305,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2017-05-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "126",
        "deceasedName": "佐藤 結衣",
        "dateOfDeath": "2021-12-22",
        "status": "進行中",
        "taxAmount": 132072096,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "estimateAmount": 4918551,
        "propertyValue": 461855194,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-01-16",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "127",
        "deceasedName": "田中 優子",
        "dateOfDeath": "2028-03-24",
        "status": "完了",
        "taxAmount": 38125455,
        "assignee": "田中 次郎",
        "feeAmount": 2241814,
        "fiscalYear": 2028,
        "referrer": "税理士E",
        "estimateAmount": 2254164,
        "propertyValue": 195416454,
        "referralFeeRate": 10,
        "referralFeeAmount": 224181,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-04-15",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "128",
        "deceasedName": "高橋 太郎",
        "dateOfDeath": "2016-11-14",
        "status": "未着手",
        "taxAmount": 27144310,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "保険会社F",
        "estimateAmount": 1646418,
        "propertyValue": 134641802,
        "referralFeeRate": 10,
        "referralFeeAmount": 164641,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-12-10",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "129",
        "deceasedName": "伊藤 三郎",
        "dateOfDeath": "2028-09-06",
        "status": "未着手",
        "taxAmount": 38404777,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2028,
        "referrer": "保険会社F",
        "estimateAmount": 2839525,
        "propertyValue": 253952529,
        "referralFeeRate": 10,
        "referralFeeAmount": 283952,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-09-09",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "130",
        "deceasedName": "渡辺 三郎",
        "dateOfDeath": "2016-08-08",
        "status": "完了",
        "taxAmount": 96825291,
        "assignee": "田中 次郎",
        "feeAmount": 4603147,
        "fiscalYear": 2016,
        "referrer": "葬儀社B",
        "estimateAmount": 4585043,
        "propertyValue": 428504342,
        "referralFeeRate": 10,
        "referralFeeAmount": 460314,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-08-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "131",
        "deceasedName": "加藤 三郎",
        "dateOfDeath": "2035-11-22",
        "status": "進行中",
        "taxAmount": 124550476,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "知人紹介",
        "estimateAmount": 4773340,
        "propertyValue": 447334071,
        "referralFeeRate": 15,
        "referralFeeAmount": 716001,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-11-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "132",
        "deceasedName": "伊藤 三郎",
        "dateOfDeath": "2024-05-05",
        "status": "完了",
        "taxAmount": 20010789,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 103991488,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-05-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "133",
        "deceasedName": "中村 大輔",
        "dateOfDeath": "2018-06-06",
        "status": "完了",
        "taxAmount": 60545060,
        "assignee": "鈴木 一郎",
        "feeAmount": 2461746,
        "fiscalYear": 2018,
        "estimateAmount": 2439806,
        "propertyValue": 213980613,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-07-01",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "134",
        "deceasedName": "加藤 花子",
        "dateOfDeath": "2024-10-27",
        "status": "未着手",
        "taxAmount": 35090745,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "税理士E",
        "estimateAmount": 0,
        "propertyValue": 124935332,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-11-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "135",
        "deceasedName": "鈴木 一郎",
        "dateOfDeath": "2032-03-11",
        "status": "完了",
        "taxAmount": 100210180,
        "assignee": "高橋 三郎",
        "feeAmount": 4132379,
        "fiscalYear": 2032,
        "referrer": "銀行C",
        "estimateAmount": 4116885,
        "propertyValue": 381688561,
        "referralFeeRate": 15,
        "referralFeeAmount": 619856,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-03-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "136",
        "deceasedName": "小林 花子",
        "dateOfDeath": "2024-12-28",
        "status": "完了",
        "taxAmount": 35916386,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "estimateAmount": 0,
        "propertyValue": 322786263,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-01-11",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "137",
        "deceasedName": "鈴木 健太",
        "dateOfDeath": "2023-01-11",
        "status": "未着手",
        "taxAmount": 122034155,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "estimateAmount": 5026176,
        "propertyValue": 472617623,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-02-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "138",
        "deceasedName": "小林 次郎",
        "dateOfDeath": "2028-09-08",
        "status": "進行中",
        "taxAmount": 69841284,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2028,
        "referrer": "税理士E",
        "estimateAmount": 4347363,
        "propertyValue": 404736301,
        "referralFeeRate": 10,
        "referralFeeAmount": 434736,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-09-24",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "139",
        "deceasedName": "小林 次郎",
        "dateOfDeath": "2024-01-12",
        "status": "完了",
        "taxAmount": 40470591,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "estimateAmount": 0,
        "propertyValue": 170263449,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-01-24",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "140",
        "deceasedName": "中村 花子",
        "dateOfDeath": "2026-04-20",
        "status": "未着手",
        "taxAmount": 56396631,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "estimateAmount": 0,
        "propertyValue": 369266446,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-05-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "141",
        "deceasedName": "田中 美咲",
        "dateOfDeath": "2016-01-19",
        "status": "未着手",
        "taxAmount": 21715234,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "銀行C",
        "estimateAmount": 2271992,
        "propertyValue": 197199234,
        "referralFeeRate": 10,
        "referralFeeAmount": 227199,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-02-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "142",
        "deceasedName": "佐藤 優子",
        "dateOfDeath": "2023-09-04",
        "status": "未着手",
        "taxAmount": 41815317,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "referrer": "銀行B",
        "estimateAmount": 1853963,
        "propertyValue": 155396304,
        "referralFeeRate": 20,
        "referralFeeAmount": 370792,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-09-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "143",
        "deceasedName": "渡辺 太郎",
        "dateOfDeath": "2028-01-11",
        "status": "未着手",
        "taxAmount": 26322781,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2028,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 120865883,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-01-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "144",
        "deceasedName": "田中 陽翔",
        "dateOfDeath": "2021-08-23",
        "status": "未着手",
        "taxAmount": 75551842,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "銀行A",
        "estimateAmount": 2926611,
        "propertyValue": 262661102,
        "referralFeeRate": 10,
        "referralFeeAmount": 292661,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-08-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "145",
        "deceasedName": "田中 一郎",
        "dateOfDeath": "2025-04-13",
        "status": "完了",
        "taxAmount": 95052544,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 432465437,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-05-02",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "146",
        "deceasedName": "中村 花子",
        "dateOfDeath": "2026-07-25",
        "status": "完了",
        "taxAmount": 102090623,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2026,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 487870754,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2026-08-16",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "147",
        "deceasedName": "高橋 優子",
        "dateOfDeath": "2033-10-01",
        "status": "完了",
        "taxAmount": 12272327,
        "assignee": "鈴木 一郎",
        "feeAmount": 1318113,
        "fiscalYear": 2033,
        "referrer": "銀行C",
        "estimateAmount": 1339839,
        "propertyValue": 103983994,
        "referralFeeRate": 20,
        "referralFeeAmount": 263622,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-10-03",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "148",
        "deceasedName": "佐藤 大輔",
        "dateOfDeath": "2015-03-08",
        "status": "未着手",
        "taxAmount": 83175534,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "税理士D",
        "estimateAmount": 0,
        "propertyValue": 449123541,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-03-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "149",
        "deceasedName": "伊藤 美咲",
        "dateOfDeath": "2017-09-23",
        "status": "未着手",
        "taxAmount": 56056439,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2017,
        "estimateAmount": 2178450,
        "propertyValue": 187845059,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2017-10-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "150",
        "deceasedName": "高橋 太郎",
        "dateOfDeath": "2016-08-19",
        "status": "進行中",
        "taxAmount": 14747998,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "税理士D",
        "estimateAmount": 838255,
        "propertyValue": 53825582,
        "referralFeeRate": 15,
        "referralFeeAmount": 125738,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-08-27",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "151",
        "deceasedName": "佐藤 美咲",
        "dateOfDeath": "2019-07-14",
        "status": "未着手",
        "taxAmount": 116181911,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "葬儀社A",
        "estimateAmount": 4737097,
        "propertyValue": 443709771,
        "referralFeeRate": 10,
        "referralFeeAmount": 473709,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-07-19",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "152",
        "deceasedName": "高橋 陽翔",
        "dateOfDeath": "2016-08-25",
        "status": "未着手",
        "taxAmount": 10191923,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "葬儀社A",
        "estimateAmount": 0,
        "propertyValue": 97451808,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-09-15",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "153",
        "deceasedName": "伊藤 優子",
        "dateOfDeath": "2027-06-17",
        "status": "進行中",
        "taxAmount": 41432326,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "銀行C",
        "estimateAmount": 4025506,
        "propertyValue": 372550681,
        "referralFeeRate": 10,
        "referralFeeAmount": 402550,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-06-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "154",
        "deceasedName": "山本 美咲",
        "dateOfDeath": "2029-06-07",
        "status": "進行中",
        "taxAmount": 128085036,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "銀行C",
        "estimateAmount": 5272212,
        "propertyValue": 497221246,
        "referralFeeRate": 20,
        "referralFeeAmount": 1054442,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-06-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "155",
        "deceasedName": "佐藤 優子",
        "dateOfDeath": "2023-07-01",
        "status": "未着手",
        "taxAmount": 47765297,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2023,
        "referrer": "葬儀社B",
        "estimateAmount": 4832735,
        "propertyValue": 453273538,
        "referralFeeRate": 15,
        "referralFeeAmount": 724910,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2023-07-04",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "156",
        "deceasedName": "加藤 陽翔",
        "dateOfDeath": "2022-04-23",
        "status": "完了",
        "taxAmount": 9710650,
        "assignee": "高橋 三郎",
        "feeAmount": 745909,
        "fiscalYear": 2022,
        "referrer": "保険会社F",
        "estimateAmount": 736604,
        "propertyValue": 43660450,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-05-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "157",
        "deceasedName": "高橋 太郎",
        "dateOfDeath": "2035-03-16",
        "status": "未着手",
        "taxAmount": 16305337,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "referrer": "銀行C",
        "estimateAmount": 873819,
        "propertyValue": 57381960,
        "referralFeeRate": 10,
        "referralFeeAmount": 87381,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-04-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "158",
        "deceasedName": "山本 次郎",
        "dateOfDeath": "2032-03-13",
        "status": "完了",
        "taxAmount": 6623757,
        "assignee": "田中 次郎",
        "feeAmount": 790492,
        "fiscalYear": 2032,
        "referrer": "葬儀社B",
        "estimateAmount": 789555,
        "propertyValue": 48955535,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-04-11",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "159",
        "deceasedName": "佐藤 蓮",
        "dateOfDeath": "2032-05-16",
        "status": "進行中",
        "taxAmount": 43883014,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "estimateAmount": 3698334,
        "propertyValue": 339833484,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-06-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "160",
        "deceasedName": "伊藤 一郎",
        "dateOfDeath": "2029-11-29",
        "status": "進行中",
        "taxAmount": 10866323,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2029,
        "referrer": "税理士D",
        "estimateAmount": 892882,
        "propertyValue": 59288228,
        "referralFeeRate": 15,
        "referralFeeAmount": 133932,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2029-12-14",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "161",
        "deceasedName": "山本 健太",
        "dateOfDeath": "2024-06-08",
        "status": "未着手",
        "taxAmount": 74797794,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "estimateAmount": 3410511,
        "propertyValue": 311051165,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-06-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "162",
        "deceasedName": "佐藤 大輔",
        "dateOfDeath": "2022-01-23",
        "status": "完了",
        "taxAmount": 95877660,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "estimateAmount": 0,
        "propertyValue": 490823970,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-02-10",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "163",
        "deceasedName": "小林 結衣",
        "dateOfDeath": "2018-10-23",
        "status": "進行中",
        "taxAmount": 32812846,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2018,
        "estimateAmount": 2198436,
        "propertyValue": 189843624,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2018-10-25",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "164",
        "deceasedName": "鈴木 美咲",
        "dateOfDeath": "2015-12-07",
        "status": "進行中",
        "taxAmount": 137393270,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "知人紹介",
        "estimateAmount": 4892591,
        "propertyValue": 459259125,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-01-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "165",
        "deceasedName": "中村 次郎",
        "dateOfDeath": "2015-01-17",
        "status": "未着手",
        "taxAmount": 52978318,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 222619360,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-01-24",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "166",
        "deceasedName": "加藤 花子",
        "dateOfDeath": "2031-05-06",
        "status": "未着手",
        "taxAmount": 19641577,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "referrer": "税理士D",
        "estimateAmount": 1857621,
        "propertyValue": 155762185,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-05-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "167",
        "deceasedName": "渡辺 太郎",
        "dateOfDeath": "2034-12-03",
        "status": "進行中",
        "taxAmount": 5280716,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2034,
        "referrer": "葬儀社B",
        "estimateAmount": 509764,
        "propertyValue": 20976410,
        "referralFeeRate": 10,
        "referralFeeAmount": 50976,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-12-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "168",
        "deceasedName": "小林 次郎",
        "dateOfDeath": "2021-05-11",
        "status": "進行中",
        "taxAmount": 33506589,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "銀行A",
        "estimateAmount": 2066894,
        "propertyValue": 176689438,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-05-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "169",
        "deceasedName": "渡辺 健太",
        "dateOfDeath": "2025-09-26",
        "status": "完了",
        "taxAmount": 50422642,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "estimateAmount": 0,
        "propertyValue": 326421041,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-10-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "170",
        "deceasedName": "中村 美咲",
        "dateOfDeath": "2027-01-10",
        "status": "完了",
        "taxAmount": 86043630,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "税理士E",
        "estimateAmount": 0,
        "propertyValue": 295911551,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-01-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "171",
        "deceasedName": "佐藤 花子",
        "dateOfDeath": "2034-12-04",
        "status": "完了",
        "taxAmount": 71450561,
        "assignee": "田中 次郎",
        "feeAmount": 3876794,
        "fiscalYear": 2034,
        "estimateAmount": 3870479,
        "propertyValue": 357047910,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2034-12-09",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "172",
        "deceasedName": "田中 優子",
        "dateOfDeath": "2024-04-25",
        "status": "未着手",
        "taxAmount": 2367820,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "referrer": "保険会社F",
        "estimateAmount": 0,
        "propertyValue": 19589672,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-04-30",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "173",
        "deceasedName": "渡辺 健太",
        "dateOfDeath": "2027-09-18",
        "status": "進行中",
        "taxAmount": 46500600,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "estimateAmount": 2926726,
        "propertyValue": 262672640,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-09-18",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "174",
        "deceasedName": "伊藤 健太",
        "dateOfDeath": "2021-07-15",
        "status": "進行中",
        "taxAmount": 30432058,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "葬儀社A",
        "estimateAmount": 2745659,
        "propertyValue": 244565975,
        "referralFeeRate": 10,
        "referralFeeAmount": 274565,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-07-28",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "175",
        "deceasedName": "高橋 結衣",
        "dateOfDeath": "2020-08-12",
        "status": "完了",
        "taxAmount": 84261357,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2020,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 423802247,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2020-09-07",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "176",
        "deceasedName": "山本 結衣",
        "dateOfDeath": "2025-01-09",
        "status": "進行中",
        "taxAmount": 7820244,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2025,
        "referrer": "保険会社F",
        "estimateAmount": 692479,
        "propertyValue": 39247921,
        "referralFeeRate": 20,
        "referralFeeAmount": 138495,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-01-11",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "177",
        "deceasedName": "高橋 三郎",
        "dateOfDeath": "2033-07-25",
        "status": "進行中",
        "taxAmount": 36838900,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "referrer": "税理士E",
        "estimateAmount": 2559016,
        "propertyValue": 225901617,
        "referralFeeRate": 15,
        "referralFeeAmount": 383852,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-08-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "178",
        "deceasedName": "佐藤 次郎",
        "dateOfDeath": "2032-01-20",
        "status": "未着手",
        "taxAmount": 45837669,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2032,
        "referrer": "銀行C",
        "estimateAmount": 4046229,
        "propertyValue": 374622945,
        "referralFeeRate": 10,
        "referralFeeAmount": 404622,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-01-24",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "179",
        "deceasedName": "高橋 花子",
        "dateOfDeath": "2025-01-25",
        "status": "完了",
        "taxAmount": 28845710,
        "assignee": "鈴木 一郎",
        "feeAmount": 1750563,
        "fiscalYear": 2025,
        "referrer": "銀行C",
        "estimateAmount": 1750905,
        "propertyValue": 145090560,
        "referralFeeRate": 20,
        "referralFeeAmount": 350112,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2025-02-17",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "180",
        "deceasedName": "鈴木 優子",
        "dateOfDeath": "2016-10-15",
        "status": "完了",
        "taxAmount": 41443637,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 395927878,
        "referralFeeRate": 20,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-11-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "181",
        "deceasedName": "佐藤 健太",
        "dateOfDeath": "2019-07-08",
        "status": "進行中",
        "taxAmount": 79947226,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2019,
        "referrer": "税理士D",
        "estimateAmount": 5056676,
        "propertyValue": 475667686,
        "referralFeeRate": 15,
        "referralFeeAmount": 758501,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2019-07-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "182",
        "deceasedName": "高橋 美咲",
        "dateOfDeath": "2022-02-17",
        "status": "進行中",
        "taxAmount": 52417161,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2022,
        "referrer": "銀行B",
        "estimateAmount": 2504895,
        "propertyValue": 220489565,
        "referralFeeRate": 10,
        "referralFeeAmount": 250489,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2022-03-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "183",
        "deceasedName": "鈴木 大輔",
        "dateOfDeath": "2033-06-19",
        "status": "完了",
        "taxAmount": 6776205,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2033,
        "estimateAmount": 0,
        "propertyValue": 22960191,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2033-06-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "184",
        "deceasedName": "渡辺 太郎",
        "dateOfDeath": "2020-02-07",
        "status": "進行中",
        "taxAmount": 31343156,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2020,
        "estimateAmount": 3270672,
        "propertyValue": 297067287,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2020-02-20",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "185",
        "deceasedName": "高橋 次郎",
        "dateOfDeath": "2021-02-14",
        "status": "未着手",
        "taxAmount": 21822715,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "estimateAmount": 2383161,
        "propertyValue": 208316108,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-03-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "186",
        "deceasedName": "高橋 花子",
        "dateOfDeath": "2016-01-21",
        "status": "未着手",
        "taxAmount": 57888507,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "葬儀社B",
        "estimateAmount": 3371098,
        "propertyValue": 307109892,
        "referralFeeRate": 10,
        "referralFeeAmount": 337109,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-01-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "187",
        "deceasedName": "佐藤 優子",
        "dateOfDeath": "2020-06-07",
        "status": "進行中",
        "taxAmount": 85047675,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2020,
        "referrer": "葬儀社A",
        "estimateAmount": 5049563,
        "propertyValue": 474956393,
        "referralFeeRate": 10,
        "referralFeeAmount": 504956,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2020-06-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "188",
        "deceasedName": "山本 優子",
        "dateOfDeath": "2021-02-01",
        "status": "完了",
        "taxAmount": 8212509,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 54113636,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-02-22",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "189",
        "deceasedName": "中村 優子",
        "dateOfDeath": "2024-05-03",
        "status": "完了",
        "taxAmount": 61724202,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2024,
        "estimateAmount": 0,
        "propertyValue": 441663365,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2024-05-21",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "190",
        "deceasedName": "高橋 一郎",
        "dateOfDeath": "2031-04-14",
        "status": "進行中",
        "taxAmount": 80684598,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2031,
        "estimateAmount": 3066358,
        "propertyValue": 276635820,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2031-04-14",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "191",
        "deceasedName": "中村 花子",
        "dateOfDeath": "2028-11-01",
        "status": "未着手",
        "taxAmount": 16532578,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2028,
        "estimateAmount": 1858039,
        "propertyValue": 155803958,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-11-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "192",
        "deceasedName": "田中 太郎",
        "dateOfDeath": "2028-03-06",
        "status": "完了",
        "taxAmount": 97463698,
        "assignee": "田中 次郎",
        "feeAmount": 4997832,
        "fiscalYear": 2028,
        "estimateAmount": 5019532,
        "propertyValue": 471953284,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2028-03-06",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "193",
        "deceasedName": "高橋 次郎",
        "dateOfDeath": "2035-01-21",
        "status": "未着手",
        "taxAmount": 72028421,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2035,
        "estimateAmount": 0,
        "propertyValue": 486801789,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "未判定",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2035-02-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "194",
        "deceasedName": "鈴木 蓮",
        "dateOfDeath": "2015-09-22",
        "status": "完了",
        "taxAmount": 5175616,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2015,
        "referrer": "銀行B",
        "estimateAmount": 0,
        "propertyValue": 18145140,
        "referralFeeRate": 15,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2015-10-13",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "195",
        "deceasedName": "山本 美咲",
        "dateOfDeath": "2021-07-28",
        "status": "完了",
        "taxAmount": 3228297,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2021,
        "referrer": "銀行A",
        "estimateAmount": 0,
        "propertyValue": 28180182,
        "referralFeeRate": 10,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2021-08-08",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "196",
        "deceasedName": "田中 太郎",
        "dateOfDeath": "2016-12-01",
        "status": "未着手",
        "taxAmount": 6487362,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "referrer": "銀行C",
        "estimateAmount": 529611,
        "propertyValue": 22961132,
        "referralFeeRate": 15,
        "referralFeeAmount": 79441,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-12-26",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "197",
        "deceasedName": "山本 健太",
        "dateOfDeath": "2017-02-20",
        "status": "進行中",
        "taxAmount": 64305725,
        "assignee": "田中 次郎",
        "feeAmount": 0,
        "fiscalYear": 2017,
        "referrer": "銀行A",
        "estimateAmount": 4031114,
        "propertyValue": 373111494,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2017-03-12",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "198",
        "deceasedName": "高橋 一郎",
        "dateOfDeath": "2016-10-25",
        "status": "完了",
        "taxAmount": 77566954,
        "assignee": "高橋 三郎",
        "feeAmount": 0,
        "fiscalYear": 2016,
        "estimateAmount": 0,
        "propertyValue": 474570457,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託不可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2016-10-27",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "199",
        "deceasedName": "小林 健太",
        "dateOfDeath": "2027-02-04",
        "status": "未着手",
        "taxAmount": 46532088,
        "assignee": "鈴木 一郎",
        "feeAmount": 0,
        "fiscalYear": 2027,
        "referrer": "税理士E",
        "estimateAmount": 3991527,
        "propertyValue": 369152749,
        "referralFeeRate": 15,
        "referralFeeAmount": 598729,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2027-02-05",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    },
    {
        "id": "200",
        "deceasedName": "高橋 太郎",
        "dateOfDeath": "2032-12-18",
        "status": "完了",
        "taxAmount": 123200238,
        "assignee": "田中 次郎",
        "feeAmount": 5101658,
        "fiscalYear": 2032,
        "estimateAmount": 5076732,
        "propertyValue": 477673231,
        "referralFeeRate": 0,
        "referralFeeAmount": 0,
        "acceptanceStatus": "受託可",
        "progress": [
            {
                "id": "step-1",
                "name": "初回連絡",
                "date": "2032-12-29",
                "memo": ""
            },
            {
                "id": "step-2",
                "name": "初回面談",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-3",
                "name": "2回目訪問",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-8",
                "name": "最終チェック完了",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-4",
                "name": "遺産分割",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-5",
                "name": "申告",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-6",
                "name": "請求",
                "date": null,
                "memo": ""
            },
            {
                "id": "step-7",
                "name": "入金確認",
                "date": null,
                "memo": ""
            }
        ],
        "contacts": []
    }
]

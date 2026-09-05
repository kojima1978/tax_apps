/**
 * 様式ごとの右上のQRコード（29×29モジュール）。
 *
 * `public/01_r08.pdf`（国税庁の令和8年4月1日以降用の様式）を300dpiで描画し、右上のQRを
 * 切り出してモジュール格子へ戻したもの。ファインダ3個とタイミングパターンが規格どおりであること、
 * および読み取った中身が各様式IDそのものであることを13様式すべてで確認済み。
 * 中身は様式に印刷されているものそのままで、こちらでは生成しない。
 *
 * 値は 29×29 ビットを行優先で詰めた141文字のbase64（末尾5ビットは詰め物）。
 * 描画は `lib/qrPath.ts`、紙面上の位置・大きさは `components/ui/formGeometry.ts` の `qrBox`。
 */

/** QRの一辺のモジュール数（型番3・13様式とも共通） */
export const QR_SIZE = 29;

/** 様式ID → QRのモジュール（base64） */
export const FORM_QR: Readonly<Record<string, string>> = {
  // 第１表の１
  NTA0VNA170010010: '/ojz/BNOkG6r/rt0eWXbqnIuwSHRB/qqr+ATAAAGICqshQR1X7or90qTyRL58+v2JlNAmzkJt4/NIH5koo6NrUs2mQNTUvw+yeFb+YBHdHf5AGtQWskYumQ/3dKQBC6NQRUEsjRP4ioNA',
  // 第１表の１（続紙）
  NTA0VNA170020010: '/p2j/BOFEG6DnLt11pXbpsKuwQtpB/qqr+AIjgAuw6RPKvmKgItAeXDlYr6iCr6cQemoONExSBEi30aHLLAlROWh3VYG6IbVaqPr+gB9jEv4yCuwUEUSurFvjdJ5qq6supsEQcu/5pLug',
  // 第１表の２
  NTA0VNA180010010: '/ojz/BJukG6yfrt0qWXbqsIuwSGRB/qqr+ATMAAGMCqsxQZ1X6M790JbiR5726vcPgFA33kJsb3dIF51oo6Pj0s3kYtTUvByyOEV+YBXNHf5YGtQW8kYunU/3dKSBC6VQRUEcrRP4EINA',
  // 第２表
  NTA0VNA190010010: '/sjz/BJukG67frt0uWXbqWouwSGRB/qqr+ARIAAGMSqsxQR1TLOz91obSRr/Hcvsv1JAHV0Js7/tIH91oo6Pr0s0gYLTQrx6yend+YBf9Hf5RmtQW9kYumQ/3dCwBC6V0RUEfvRP5gYNA',
  // 第３表
  NTA0VNA200010010: '/sjz/BNukG6j/rt08GXbq3IuwS0RB/qqr+ATAAAGISqoxQR1bLMjdtpfQRf1VfPcL0BAm3kJt5ztIH5loo7NjUs3mQvTWrjyyKEx+YBDJHf5QmtQWNkYumU/3dCwBC6cwRUE8jRP4gYNA',
  // 第４表の１
  NTA0VNA210010010: '/tmj/BKlEG6LnLt1Q5XbpmKuwQPpB/qqr+AIngAu0qRLKvmKgILQ+fDharvg6Kacjfuo/JExTBES32aGLLBnZOWi3M8G+E7Raynv+gB4zEv4qmuwUkcSurFvjdJ7qq6tKpsECYu/5HTug',
  // 第４表の２
  NTA0VNA210020010: '/szz/BJukG6j/rt07GXbqtIuwSlRB/qqr+ATEAAGMSqohQR1X7O7d8qXwRe7EfP26kFAX3kJs4/9IF5loo7PjUs1mJpTQjQ6yGtf+YBCNHf5YitQWMsYumQ/3dKSBC6M0RUE+nRP4MwNA',
  // 第５表
  NTA0VNA220010010: '/ojz/BJOkG6zfrt05WXbqfouwS2RB/qqr+ATMAAGISqsxwR1fKqjd8KTwRO327PEOhJAW3sJtZ7NIF5loo6Nr0s1gQtTQji2ya3x+YBatHf5AmtQW+kYunQ/3dKQBC6cURUEunRP4CwNA',
  // 第５表（続紙）
  NTA0VNA220020010: '/p2j/BKFEG6bHLt1SpXbpUquwQcpB/qqr+AIvgAuwqRPaPmKo5vI+fjlar/sIuauXaio+JMxSgAi32aGLLAlRuWixV4G+EJdau9B+gBgTEv4yiuwUWUSuqFvjdJ5qq69qpsESYu/5JTug',
  // 第６表
  NTA0VNA230010010: '/tmj/BGlEG6THLt1QpXbp9quwQcpB/qqr+ALngAu06RLaNuKsINI+fAt6r7sqIaUVTqoeLMxTiIy30eXLLBlROWh1c+G4EJVam+r+gB4XEv4yGuwUHcSurBvjdJbqq60OpsETYu/5lzug',
  // 第７表の１
  NTA0VNA240010010: '/t2j/BGlEG6aHLt1ApXbpvKuwQdpB/qqr+AIvgAuwqRPKNuKgYpY+eAlarpk6oa2gLmoutMxTDMi30eGLLAlZOWhxVeG+EKZa+8r+gBkDEv4rmuwU2cSuqFvjdJZqq61OpsECYu/4DTug',
  // 第７表の２
  NTA0VNA240020010: '/sjz/BFukG6yfrt0rWXbqkIuwS3RB/qqr+ATMAAGISqshyZ1Xrszd9pTwRY/E9Pc5wNAGTsJs63NIH9loo6NjUs2gQLTQjhyyK2b+YBe9Hf5ZitQWesYunQ/3dKwBC6UwRUE+nRP5IwNA',
  // 第７表の３
  NTA0VNA240030010: '/ojz/BFukG66/rt0rWXbqkouwSERB/qqr+AQMAAGMSqoxSZ1fLI7dlJbQRO3XdPmvsNAnzkJs6ztIH91oo6Pj0s2gQLTWvTyyC93+YBHJHf5BGtQW+sYunQ/3dCyBC6E0RUEfvRP5GANA',
};

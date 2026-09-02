/**
 * 様式ごとの右上のQRコード（29×29モジュール）。
 *
 * `apps/tax-docs/sample/` の様式PDFを300dpiで描画し、右上のQRを切り出して
 * モジュール格子へ戻したもの。ファインダ3個とタイミングパターンが規格どおりであることを
 * 全24様式で確認済み。中身は国税庁の様式に印刷されているものそのままで、こちらでは生成しない。
 *
 * 値は 29×29 ビットを行優先で詰めた106バイトのbase64（末尾7ビットは詰め物）。
 * 描画は `lib/qrPath.ts`。
 */
export const QR_SIZE = 29;

/** 様式ID → QRのモジュール（base64） */
export const FORM_QR: Readonly<Record<string, string>> = {
  // 第1表
  NTA1KSE010010030: '/t2j/BKkEG6SlLt1A4Xbp2ouwQMpB/qqr+AKjgAuwqRLavmKoYPY+Hglqr4qZLak1OvoOrc1ShES70eXLLBnZOWgzMcG+MrRaq3p+gBt3Ev4zmowUmcWurBvjdJ7oq60OrsEDUq/5vbmgA==',
  // 第1表（続）
  NTA0KSE011010030: '/sjz/BB/kG679rt0KXXbq9quwSHRB/qqr+AQEAAGICqsxQR1bKordloTARvxV+PE99EAHz0NtY/dEF90oo6NjUs2gYJTQrS2yC27+YBOdHf5RGpQWvkcumQ/3dKSDC6N2TUEdvVP4moFAA==',
  // 第2表
  NTA0KSE020010020: '/oyz/BF8kG6zZrt0fXXbqkMuwS1RB/qqr+ATAAAGICqsxyZ1TqojdlrbQRO9u6PE45IAHT0Ntb7tEF5loo6Nj0s3kANTSjQ2ye3T+YBTdHf5QmpQW9kcumU/3dCSDC6V0TUEvrVP4uQFAA==',
  // 第4表
  NTA0KSE040010040: '/t3j/BK0EG6DDLt1m5Xbp/IuwQOpB/qqr+ALrgAu06RLKvmKkoLI+fghKr+uxpa01Knovrc1TiES72aWLLBlZOWi3VeG4EoZa+9v+gBkDEv4zGqwUGcWuqFvjdJboq6ksrsEjcq/5JzmgA==',
  // 第4表の2
  NTA0KSE041010010: '/pmj/BG1EG6bnLt1y5XbpWquwQcpB/qqr+AJngAuw6RLavuKgZrI+GBpqr8iJJaEyTnofPU1TDAi70aGLLBnZOWhzV+G8IpRaqnL+gBsjEv4jGqwUGcWuqFvjdBboq61srsEhUq/5JjmgA==',
  // 第5表
  NTA0KSE050010020: '/oiz/BJ8kG665rt0OHXbqnMuwSURB/qqr+ARMAAGISqoxQZ1XLujd1LbQRc3dYPc5gEAmX0NtZ/tEF5loo7PrUs0mYvTUvh6yCUd+YBHJHf5BmpQWMkcumU/3dKyDC6U2TUEPnVP4IIFAA==',
  // 第6表
  NTA0KSE060010030: '/j4r/BOM0G6QGrt0YmXbrEwuwT8JB/qqr+ARbQAzzZ6BQBoEgYzoG0AOLIhgkFUE96TTfOnW1LKs1+qvzzjG6N1v7KyIE0DlhfeE/AB7NGv6C+qQTG8VukPvtdZhQS62pIMENSk/49zeAA==',
  // 第7表
  NTA0KSE070010030: '/t2j/BKUEG6bFLt1l4Xbp1ouwQvpB/qqr+AIjgAuw6RLavuKsptI+eAhIrvoaLa0yHno+pc1TgEy72eXLLAnZuWi1N4G4M7Va2uF+gBsDEv4iGqwUHcWuqBvjdBboq68qrsERYq/4BTmgA==',
  // 第8の8表
  NTA0KSE088010010: '/t2j/BKVEG6aHLt11pXbp1KuwQPpB/qqr+AIjgAu0qRPKvuKoIrQ+OilYreqYPaE1XnoPJM1TjEC70eGLLBnRuWjzc6G4EoZa2/j+gB93Ev4jmqwUGcWuqBvjdJ7oq61ursEQcq/5tDmgA==',
  // 第9表
  NTA0KSE090010020: '/tnj/BeDkG6PFrt1S4XbrYquwUKNB/qqr+AMPAASUenfavmKoMJ0aqFNsPJm5paiEuHMKNoRzCMS7y+jvvkB9qyg3d+GcsO1+ShJ+ABtzEv4eiuQQz8SujFvjdddMO6AOPMEBQq/4PXCAA==',
  // 第10表
  NTA0KSE100010020: '/pnj/BC3EG6KBLt1xoXbpduuwQPpB/qqr+AKjgAu06RPatuKkJPAeXglKr4iLra2Tero+rU1TCIi70aGLLBlZuWj3E6G4EpZayWj+gBsHEv4rGqwU1cWuqFvjdBZoq60IrsETUq/5NDmgA==',
  // 第11表
  NTA0KSE160010010: '/kzz/BQ/kG63SLt1sTXbqreuwWnBB/qqr+AANAAnl/XxgFMgF9cFLVpLSBu1u+OufhBBbeRgArqoRRLCeeLN7E80gZpSWuT3z3aW/wBaJGP7/SvwWu0cumU/3dDzCC6oZ+8Ea+Af44GzgA==',
  // 第11表の付表1
  NTA0KSE161010020: '/tnj/BG3EG6DhLt1SoXbp8OuwQPpB/qqr+ALjgAuwqRPaPuKsJJAeejlorusQLa2RLrouNE1SDMi70aXLLAlZuWjzc8G8IoVayUB+gBxzEv4ymqwU3cWuqFvjdJZoq60OrsESUq/4LDmgA==',
  // 第11表の付表2
  NTA0KSE162010020: '/oyz/BNskG6j5rt05HXbq1MuwSnRB/qqr+ARIAAGICqsxwR1bLsz9soTiR5zeeP2p1IAXT0Nt77dEH5koo7Nj0s3kYvTQnjyya/f+YBS9Hf5YGpQW9kcunQ/3dKSDC6c0TUEenVP5OoFAA==',
  // 第11表の付表3
  NTA0KSE163010020: '/pnj/BKXEG6aBLt1RoXbpcOuwQPpB/qqr+AIngAuw6RPKPmKo5JAeXjp4rZk6ra+nTjo/tc1ThAy72aGLLBlROWjzcaG4MYRaqNn+gBpjEv4ymqwUVcWurFvjdJ7oq68MrsECQq/5pLmgA==',
  // 第11表の付表4
  NTA0KSE164010020: '/p3j/BCHEG6ShLt1V4XbpnuuwQ+pB/qqr+AJjgAuwqRLaNuKoJtYefgpYrKiALakQfjoftM1TgMi72eWLLAlZuWgxVaG6I4damtH+gBwTEv4zGqwUmcWurFvjdJ5oq6tMrsEAQq/4vjmgA==',
  // 第11の2表
  NTA0KSE111010040: '/r5r/BVHkG6z7rt0onXbocquwUXRB/qqr+AbAAA6sS89ABgEnqM793KVSTXqWFVmnoMIX3sNspKs135loo5NhWuv9aSJenJ+6CU7+YB2NGv5YGpQQekeutLvtdaYLK6swTUE+Wk/4KgFAA==',
  // 第11・11の2表の付表1
  NTA0KSE112010030: '/t2j/BOEEG6TFLt12oXbpmIuwQtpB/qqr+ALvgAu06RPavuKo5vYeHhhar9uiraM2CvoeNM1SAAi70eWLLAnZuWh3NcG+E6Va2uL+gBsDEv4zmqwUGcWuqFvjdJ7oq60ursEQcq/4jTmgA==',
  // 第11・11の2表の付表1（続）
  NTA0KSE113010030: '/ojz/BFfkG6zdrt0dHXbqvKuwSFRB/qqr+AREAAGMSqsxQR1f7Kr91qXQRqxs+PMO8MAnT8Nt43dEH9loo7Pj0s1gJPTSrxyyeFV+YBPNHf5ZGpQWMkcunQ/3dKwDC6cUTUEcvVP5m4FAA==',
  // 第11・11の2表の付表1（別表１）
  NTA0KSE114010030: '/v4r/BRHkG6ydrt07mXbolquwUVRB/qqr+AbIAA6sS85AhoEvqM792JVyTEoGFVmj5EI3VsNtoC8119koo5Pp2uv5D0JYjpy6WPV+YB6dGv5QGpQQckeutLvtda6LK6kUTUEOWk/4i4FAA==',
  // 第13表
  NTA0KSE130010020: '/nlz/BZMUG6U3rt0wqXbpQKuwWrdB/qqr+AdLAAPZjMWjiDnL62TFWqkTib8z7JO9JwyKZyDgweQpg6zvv3Bn4gN8wTqYkMx/vdI/oBFLFP7xepwVMUfuoX/xdKCzy6S4dcERC4v5PvCAA==',
  // 第14表
  NTA0KSE141010040: '/p3j/BaAkG6Xnrt1l5XbrjsuwU6NB/qqr+APPAASUenfavmKgcL86jnNOP5kTpayx6DMqJ4RzBES7w+zvvlB9qyg1VeGYkP1+W5D+AB5jEv4WiuQQx8SujFvjdV9MO6BoPMERQq/4LPCAA==',
  // 第15表
  NTA0KSE150010030: '/szz/BFvkG6r9rt0dXXbqtquwSWRB/qqr+ARIAAGICqsxQZ1T7qj99qTwRo3W4P0IkEAmxkNt6z9EF5koo7NjUs3iRPTWri6yG37+YBHZHf5AGpQWMkcunQ/3dKwDC6NyTUE9nVP5CAFAA==',
  // 第15表（続）
  NTA0KSE151010030: '/p2j/BGUEG6blLt1m4Xbp1ouwQdpB/qqr+ALngAuwqRPatuKgotYePDpqruk5NaEUDvo+JM1SAAS72eXLLAnROWh1NaG+Epdayvj+gBhXEv4iGqwUFcWuqFvjdBZoq6kKrsEAYq/5nLmgA==',
};

/** QRの右に★が印字されている様式（様式PDFで確認できたのは第1表だけ） */
export const FORM_QR_STAR: ReadonlySet<string> = new Set(['NTA1KSE010010030']);

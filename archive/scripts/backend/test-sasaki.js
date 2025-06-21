const text = '佐々木';
console.log('テスト文字:', text);

// 修正後のisValidChar関数をテスト
const isValidChar = (char) => {
  const code = char.codePointAt(0);
  if (!code) return false;
  
  return (
    (code >= 0x4e00 && code <= 0x9faf) ||     // 基本漢字
    (code >= 0x3040 && code <= 0x309f) ||     // ひらがな
    (code >= 0x30a0 && code <= 0x30ff) ||     // カタカナ
    (code >= 0x0020 && code <= 0x007e) ||     // 基本ASCII
    (code >= 0xff01 && code <= 0xff5e) ||     // 全角英数字
    (code >= 0x3400 && code <= 0x4dbf) ||     // CJK拡張A
    (code >= 0xf900 && code <= 0xfaff) ||     // CJK互換漢字
    (code >= 0x20000 && code <= 0x2ffff) ||   // CJK拡張B（4バイト文字）
    code === 0x3000 || code === 0x301c ||     // 全角スペース、波ダッシュ
    (code >= 0x2010 && code <= 0x2015) ||     // ハイフン類
    (code >= 0x2018 && code <= 0x201f) ||     // 引用符類
    code === 0x2026 || code === 0x2030 || code === 0x203b || // 省略記号等
    code === 0x2212 || (code >= 0x2500 && code <= 0x257f) || // 数学記号・罫線
    code === 0x3005 || code === 0x3006 ||     // 々、〆
    code === 0x309d || code === 0x309e ||     // ひらがな繰り返し記号
    code === 0x30fd || code === 0x30fe        // カタカナ繰り返し記号
  );
};

for (let char of text) {
  const code = char.codePointAt(0).toString(16);
  console.log(`'${char}' = U+${code.toUpperCase()}: ${isValidChar(char) ? '✓' : '✗'}`);
}

// 全体テスト
const regex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff5e\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f\u3005\u3006\u309d\u309e\u30fd\u30fe\u3400-\u4dbf\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff]*$/u;
console.log('全体正規表現テスト:', regex.test(text));
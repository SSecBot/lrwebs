/**
 * Bağımlılıksız çıkarımsal (extractive) metin özetleyici.
 *
 * Algoritma:
 *  1. Markdown temizlenir, metin cümlelere ayrılır (Türkçe kısaltmalar korunur).
 *  2. Kelimeler Türkçe yerel ayara göre küçük harfe çevrilir, durak kelimeler atılır
 *     ve basit bir ek kırpma ile köke yakın biçime indirgenir.
 *  3. Terim frekansı (TF) en yüksek frekansa göre normalize edilir.
 *  4. Her cümle; içerdiği kelimelerin TF ağırlıkları, konum bonusu ve uzunluk
 *     cezası ile puanlanır.
 *  5. En yüksek puanlı cümleler seçilir ve orijinal sıralarıyla birleştirilir.
 */

export interface SummarizeOptions {
  /** Seçilecek en fazla cümle sayısı. */
  maxSentences?: number;
  /** Özetin en fazla karakter uzunluğu. */
  maxLength?: number;
}

export interface ScoredSentence {
  index: number;
  text: string;
  score: number;
}

const STOP_WORDS = new Set(
  "acaba ama ancak artık aslında az bana bazı belki ben beni benim beri bile bir biraz birçok biri birkaç birşey biz bize bizi bizim böyle böylece bu buna bunda bundan bunlar bunları bunların bunu bunun burada çok çünkü da daha dahi de defa değil diğer diye dolayı dolayısıyla edecek eden ederek edilen ediliyor edilmesi ediyor en fakat gibi göre halen hangi hatta hem henüz her herhangi herkes hiç hiçbir için ile ilgili ise işte itibaren kadar karşın kendi kendine kez ki kim kimse mı mi mu mü nasıl ne neden nerede neyse niye o olan olarak oldu olduğu olduğunu olmak olması olmayan olmaz olsa olsun olup olur olursa oluyor on ona ondan onlar onları onların onu onun orada öyle önce pek rağmen sadece sanki şey şöyle şu şuna şunda şundan şunu tarafından tüm üzere var vardı ve veya ya yani yapacak yapılan yapılması yapıyor yapmak yaptı yerine yine yoksa zaten ayrıca bunlara the and or of to in is".split(
    /\s+/,
  ),
);

const ABBREVIATIONS = [
  "vb",
  "vs",
  "örn",
  "dr",
  "prof",
  "doç",
  "sn",
  "no",
  "bkz",
  "yy",
  "mah",
  "cad",
  "sok",
  "st",
  "ltd",
  "şti",
  "a.ş",
  "inc",
  "vd",
];

const SUFFIXES = [
  "lerinden",
  "larından",
  "lerinin",
  "larının",
  "lerine",
  "larına",
  "lerini",
  "larını",
  "leri",
  "ları",
  "ler",
  "lar",
  "ında",
  "inde",
  "ından",
  "inden",
  "ının",
  "inin",
  "dır",
  "dir",
  "dur",
  "dür",
  "tır",
  "tir",
  "nın",
  "nin",
  "dan",
  "den",
  "tan",
  "ten",
  "da",
  "de",
  "ta",
  "te",
  "ı",
  "i",
  "u",
  "ü",
];

function stripMarkup(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/** Metni cümlelere ayırır. Başlık ve liste satırları ayrı birimler olarak ele alınır. */
export function tokenizeSentences(input: string): string[] {
  const cleaned = stripMarkup(input);
  const sentences: string[] = [];

  for (const rawLine of cleaned.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Başlıklar özet için uygun değildir.
    if (/^#{1,6}\s/.test(line)) continue;
    const body = line
      .replace(/^>\s?/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+\.\s+/, "");

    // Kısaltmalardaki noktaları geçici olarak koru.
    let protectedText = body;
    for (const abbr of ABBREVIATIONS) {
      const re = new RegExp(`(^|\\s)(${abbr.replace(".", "\\.")})\\.`, "gi");
      protectedText = protectedText.replace(re, "$1$2․");
    }
    // Ondalık sayıları koru (ör. 1.25).
    protectedText = protectedText.replace(/(\d)\.(\d)/g, "$1․$2");

    const parts = protectedText
      .split(/(?<=[.!?…])\s+(?=["'“(]?[A-ZÇĞİÖŞÜ0-9])/u)
      .map((s) => s.replace(/․/g, ".").trim())
      .filter(Boolean);
    sentences.push(...parts);
  }
  return sentences;
}

function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/** Cümleyi anlamlı kelime köklerine ayırır. */
export function tokenizeWords(sentence: string): string[] {
  return sentence
    .toLocaleLowerCase("tr-TR")
    .replace(/['’][a-zçğıöşü]+/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

/** Normalize edilmiş terim frekansı tablosu (0–1). */
export function termFrequencies(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const sentence of sentences) {
    for (const word of tokenizeWords(sentence)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...freq.values());
  for (const [word, count] of freq) freq.set(word, count / max);
  return freq;
}

/** Tüm cümleleri puanlayarak döndürür. */
export function scoreSentences(text: string): ScoredSentence[] {
  const sentences = tokenizeSentences(text);
  if (sentences.length === 0) return [];
  const tf = termFrequencies(sentences);
  const total = sentences.length;

  return sentences.map((sentence, index) => {
    const words = tokenizeWords(sentence);
    if (words.length === 0) return { index, text: sentence, score: 0 };

    const unique = new Set(words);
    let weight = 0;
    for (const word of unique) weight += tf.get(word) ?? 0;

    // Uzun cümlelerin avantajını dengelemek için karekök normalizasyonu.
    const density = weight / Math.sqrt(unique.size);
    // Giriş cümleleri genellikle konuyu özetler.
    const position = index === 0 ? 1.25 : index < total * 0.2 ? 1.1 : 1;
    // Çok kısa veya çok uzun cümleler özet için daha az uygundur.
    const charCount = sentence.length;
    const lengthPenalty = charCount < 40 ? 0.6 : charCount > 280 ? 0.8 : 1;
    // Noktalama ile bitmeyen parçalar (ör. liste maddeleri) tam cümle değildir.
    const fragmentPenalty = /[.!?…]["'”)]?$/.test(sentence) ? 1 : 0.55;

    return { index, text: sentence, score: density * position * lengthPenalty * fragmentPenalty };
  });
}

/** Metnin çıkarımsal özetini döndürür. */
export function summarize(text: string, options: SummarizeOptions = {}): string {
  const { maxSentences = 2, maxLength = 320 } = options;
  const scored = scoreSentences(text);
  if (scored.length === 0) return "";

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const picked: ScoredSentence[] = [];
  let length = 0;

  for (const candidate of ranked) {
    if (picked.length >= maxSentences) break;
    const extra = candidate.text.length + (picked.length ? 1 : 0);
    if (length + extra > maxLength && picked.length > 0) continue;
    // İlk cümleden sonra yalnızca tam cümleler eklenir.
    if (picked.length > 0 && !/[.!?…]["'”)]?$/.test(candidate.text)) continue;
    picked.push(candidate);
    length += extra;
  }

  const result = picked
    .sort((a, b) => a.index - b.index)
    .map((s) => s.text)
    .join(" ");

  if (result.length <= maxLength) return result;
  // Tek cümle bile sınırı aşıyorsa kelime sınırında kes.
  const cut = result.slice(0, maxLength - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 0) || cut.length).replace(/[,;:\s]+$/, "")}…`;
}

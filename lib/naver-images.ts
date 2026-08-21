export function isTrustedNaverImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    return (
      url.hostname === "naver.com" ||
      url.hostname.endsWith(".naver.com") ||
      url.hostname === "naver.net" ||
      url.hostname.endsWith(".naver.net") ||
      url.hostname === "pstatic.net" ||
      url.hostname.endsWith(".pstatic.net")
    );
  } catch {
    return false;
  }
}

export function buildRequestMessage(
  method: urllib.HttpMethod,
  url: string,
  timestamp: number,
  nonceStr: string,
  bodyStr: string,
) {
  const _url = new URL(url);
  let canonicalUrl = _url.pathname;
  if (_url.search) {
    canonicalUrl += _url.search;
  }

  return `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
}

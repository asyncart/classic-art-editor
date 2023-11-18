const IPFS_GATEWAY_URL_LC_KEY = 'ipfsGatewayURL';

export function getCustomIPFSGateway() {
  return localStorage.getItem(IPFS_GATEWAY_URL_LC_KEY) || undefined;
}

export function setCustomIPFSGateway(url: string | undefined) {
  if (!url) localStorage.removeItem(IPFS_GATEWAY_URL_LC_KEY);
  else localStorage.setItem(IPFS_GATEWAY_URL_LC_KEY, new URL(url).origin);
}

export async function fetchIpfs(
  uri: string,
  reportGateway?: (domain: string) => void
) {
  const customGateway = getCustomIPFSGateway();
  const gatewayURLs = customGateway
    ? [customGateway]
    : [
        'https://ipfs.io',
        'https://cloudflare-ipfs.com',
        'https://gateway.pinata.cloud',
        'https://dweb.link',
        'https://hardbin.com',
      ];

  for (const gatewayURL of gatewayURLs) {
    // ipfs.io times out after 2 minutes but generally if it's unable to find a file within a minute
    // it won't resolve in the next minute so we don't want the user to wait and we skip to the next provider
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 60000);
    reportGateway?.(gatewayURL.split('//')[1]);

    try {
      // Sometimes request to ipfs.io can fail with net::ERR_HTTP2_PROTOCOL_ERROR 200 (OK)
      // Attaching .catch to fetch doesn't work, fetch has to be in try/catch block
      const response = await fetch(`${gatewayURL}/ipfs/${uri}`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      if (response.ok) return response;
    } catch (error) {
      clearTimeout(id);
    }
  }

  throw new Error(`Unable to load IPFS resource at URI: ${uri}`);
}

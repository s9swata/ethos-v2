export function upscaleThumbnail(url: string, size = 320): string {
  if (!url) return placeholder(size);

  // Pattern 1: yt3/lh3 googleusercontent =wXX-hYY[-suffix]
  //   e.g. ...=w60-h60-l90-rj → ...=w320-h320
  let result = url.replace(/=w\d+-h\d+(-[a-z0-9.]+)*/i, `=w${size}-h${size}`);
  if (result !== url) return result;

  // Pattern 2: googleusercontent =s{size} (square thumbnails)
  //   e.g. ...=s192 → ...=s320
  result = url.replace(/=s\d+/, `=s${size}`);
  if (result !== url) return result;

  // Pattern 3: i.ytimg.com/vi/ID/IMAGE
  //   maxresdefault often 404s → downgrade to hqdefault
  const vidMatch = url.match(/\/vi\/([^/?#]+)/);
  if (vidMatch) {
    const id = vidMatch[1];
    if (url.includes('maxresdefault') || (url.includes('default.jpg') && !url.includes('hq') && !url.includes('mq'))) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    return url;
  }

  return url;
}

function placeholder(size: number): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="#1a1a1a" width="${size}" height="${size}"/><circle fill="#2a2a2a" cx="${size / 2}" cy="${size / 2}" r="${size * 0.2}"/><path fill="none" stroke="#333" stroke-width="2" d="M${size * 0.38} ${size * 0.42} L${size * 0.62} ${size / 2} L${size * 0.38} ${size * 0.58}Z"/></svg>`)}`;
}

export type YouTubeVideo = { id: string; title: string; channel: string; thumbnail: string };

export async function searchYouTube(query: string, max = 3): Promise<YouTubeVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.search = new URLSearchParams({
    part: 'snippet', q: query, type: 'video', maxResults: String(max),
    relevanceLanguage: 'es', safeSearch: 'strict', videoEmbeddable: 'true', key,
  }).toString();
  const res = await fetch(url, { next: { revalidate: 86_400 } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } } }[];
  };
  return (json.items ?? []).map((i) => ({
    id: i.id.videoId,
    title: i.snippet.title,
    channel: i.snippet.channelTitle,
    thumbnail: i.snippet.thumbnails.medium?.url ?? '',
  }));
}

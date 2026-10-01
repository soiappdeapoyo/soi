export type WebResult = { title: string; url: string; content: string };

export async function webSearch(query: string, max = 4): Promise<WebResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query, max_results: max, search_depth: 'basic' }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: WebResult[] };
  return (json.results ?? []).map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 500) }));
}

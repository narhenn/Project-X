async function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

export async function retrieveRelevantChunks(
  question: string | undefined,
  topK = 3
): Promise<{ content: string; similarity: number; topic: string; source: string }[]> {
  try {
    if (!question) return [];
    const supabase = await getSupabase();
    if (!supabase) return [];

    const apiKey = process.env.OPENAI_API_KEY_TUTOR || process.env.OPENAI_API_KEY;
    if (!apiKey) return [];

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey, maxRetries: 2, timeout: 30_000 });

    const res = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question,
    });
    const queryEmbedding = res.data[0].embedding;

    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_topic: null,
    });

    if (error) {
      console.error('RAG retrieval error:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      content: row.content,
      similarity: Math.round(row.similarity * 100),
      topic: row.topic,
      source: row.source,
    }));

  } catch (err) {
    console.error('RAG failed:', err);
    return [];
  }
}
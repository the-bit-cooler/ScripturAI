using ScripturAI.Models;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static async Task ProcessBatchEmbeddings(List<Verse> batch)
  {
    // Generate embeddings
    var texts = batch.ConvertAll(v => v.text);
    var embeddingsResponse = await GetEmbeddingClient().GenerateEmbeddingsAsync(texts);
    var embeddings = embeddingsResponse.Value;

    for (int j = 0; j < batch.Count; j++)
    {
      if (embeddings[j] != null)
      {
        batch[j].vector = embeddings[j].ToFloats().ToArray();
      }
    }

    // Upsert to Cosmos DB
    foreach (var verse in batch)
    {
      await DataService.UpsertVerseAsync(verse);
    }
  }
}
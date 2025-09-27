using Azure.AI.OpenAI;

namespace ScripturAI;

public class OpenAIService
{
  static readonly AzureOpenAIClient openAIClient = new(new Uri(Environment.GetEnvironmentVariable("OPEN_AI_URL")!), new Azure.AzureKeyCredential(Environment.GetEnvironmentVariable("OPEN_AI_KEY")!));

  public static async Task ProcessBatch(List<Verse> batch)
  {
    // Generate embeddings
    var texts = batch.ConvertAll(v => v.text);
    var embeddingClient = openAIClient.GetEmbeddingClient(Environment.GetEnvironmentVariable("OPEN_AI_TEXT_EMBEDDING_NAME")!);
    var embeddingsResponse = await embeddingClient.GenerateEmbeddingsAsync(texts);
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
      await CosmosDBService.UpsertVerseAsync(verse);
    }
  }
}
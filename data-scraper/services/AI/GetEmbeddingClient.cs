using OpenAI.Embeddings;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static EmbeddingClient GetEmbeddingClient()
  {
    return aIClient.GetEmbeddingClient(Environment.GetEnvironmentVariable("OPEN_AI_TEXT_EMBEDDING_NAME")!);
  }
}
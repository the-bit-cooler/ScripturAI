using OpenAI.Embeddings;

namespace ScripturAI.Services;

public partial class AiService
{
  internal EmbeddingClient GetEmbeddingClient()
  {
    return client.GetEmbeddingClient(Environment.GetEnvironmentVariable("OPEN_AI_TEXT_EMBEDDING_NAME")!);
  }
}
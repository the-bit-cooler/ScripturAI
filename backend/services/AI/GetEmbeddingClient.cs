using OpenAI.Embeddings;

namespace ScripturAI.Services;

public partial class AiService
{
  private readonly EmbeddingClient embeddingClient = new(model: Environment.GetEnvironmentVariable("OPEN_AI_TEXT_EMBEDDING_NAME"), apiKey: Environment.GetEnvironmentVariable("OPEN_AI_KEY"));

  internal EmbeddingClient GetEmbeddingClient()
  {
    return embeddingClient;
  }
}
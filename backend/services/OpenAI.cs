using Azure.AI.OpenAI;
using OpenAI.Embeddings;
using OpenAI.Chat;

namespace ScripturAI;

public class OpenAI
{
  static readonly AzureOpenAIClient openAIClient = new(new Uri(Environment.GetEnvironmentVariable("OPEN_AI_URL")!), new Azure.AzureKeyCredential(Environment.GetEnvironmentVariable("OPEN_AI_KEY")!));

  internal static EmbeddingClient GetEmbeddingClient()
  {
    return openAIClient.GetEmbeddingClient(Environment.GetEnvironmentVariable("OPEN_AI_TEXT_EMBEDDING_NAME")!);
  }

  internal static ChatClient GetChatClient()
  {
    return openAIClient.GetChatClient(Environment.GetEnvironmentVariable("OPEN_AI_CHAT_NAME")!);
  }
}
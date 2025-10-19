using Azure.AI.OpenAI;

namespace ScripturAI.Services;

public partial class AiService
{
  static readonly AzureOpenAIClient aIClient = new(new Uri(Environment.GetEnvironmentVariable("OPEN_AI_URL")!), new Azure.AzureKeyCredential(Environment.GetEnvironmentVariable("OPEN_AI_KEY")!));
}
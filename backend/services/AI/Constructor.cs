using Azure.AI.OpenAI;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class AiService
{
  private readonly AzureOpenAIClient client;
  private readonly DataService dataService;
  private readonly ILogger<AiService> logger;

  public AiService(DataService dataService, ILogger<AiService> logger)
  {
    this.client = new(new Uri(Environment.GetEnvironmentVariable("OPEN_AI_URL")!), new Azure.AzureKeyCredential(Environment.GetEnvironmentVariable("OPEN_AI_KEY")!));
    this.dataService = dataService;
    this.logger = logger;
  }
}
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class AiService
{
  private readonly DataService dataService;
  private readonly ILogger<AiService> logger;

  public AiService(DataService dataService, ILogger<AiService> logger)
  {
    this.dataService = dataService;
    this.logger = logger;
  }
}
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  private readonly CosmosClient client;
  private readonly ILogger<DataService> logger;

  public DataService(ILogger<DataService> logger)
  {
    this.client = new(Environment.GetEnvironmentVariable("COSMOS_URL"), Environment.GetEnvironmentVariable("COSMOS_KEY"));
    this.logger = logger;
  }
}
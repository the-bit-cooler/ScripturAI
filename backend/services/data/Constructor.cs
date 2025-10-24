using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  private readonly CosmosClient dbClient = new(Environment.GetEnvironmentVariable("COSMOS_URL"), Environment.GetEnvironmentVariable("COSMOS_KEY"));
  private readonly BlobServiceClient storageClient = new(Environment.GetEnvironmentVariable("AzureWebJobsStorage"));
  private readonly ILogger<DataService> logger;

  public DataService(ILogger<DataService> logger)
  {
    this.logger = logger;
  }
}
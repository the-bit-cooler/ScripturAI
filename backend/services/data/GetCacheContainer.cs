using Microsoft.Azure.Cosmos;

namespace ScripturAI.Services;

public partial class DataService
{
  internal Container GetCacheContainer()
  {
    return dbClient
      .GetDatabase(Environment.GetEnvironmentVariable("COSMOS_DATABASE_NAME"))
      .GetContainer(Environment.GetEnvironmentVariable("COSMOS_CACHE_CONTAINER_NAME"));
  }
}
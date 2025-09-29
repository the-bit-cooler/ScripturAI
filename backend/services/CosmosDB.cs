using Microsoft.Azure.Cosmos;

namespace ScripturAI;

public class CosmosDBService
{
  static readonly CosmosClient dbClient = new(Environment.GetEnvironmentVariable("COSMOS_URL"), Environment.GetEnvironmentVariable("COSMOS_KEY"));

  internal static Container GetDataContainer()
  {
    return dbClient.GetDatabase("ScripturAI").GetContainer("data");
  }

  internal static Container GetCacheContainer()
  {
    return dbClient.GetDatabase("ScripturAI").GetContainer("cache");
  }
}
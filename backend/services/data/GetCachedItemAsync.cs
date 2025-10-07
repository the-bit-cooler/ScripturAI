using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal async Task<T?> GetCachedItemAsync<T>(string id, string partitionKey, string description, string caller)
  {
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(GetCachedItemAsync)}";

    try
    {
      ItemResponse<T> response = await GetCacheContainer().ReadItemAsync<T>(id, new PartitionKey(partitionKey));
      if (response.Resource != null)
      {
        logger.LogInformation("{CallerId}: Cache hit for {Description}.", callerId, description);

        // return the cached similar verses
        return response.Resource;
      }
    }
    catch
    {
      // log below
    }
    
    logger.LogInformation("{CallerId}: Cache miss for {Description}.", callerId, description);

    return default;
  }
}
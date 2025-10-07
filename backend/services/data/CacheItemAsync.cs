using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal async Task CacheItemAsync<T>(T item, string partitionKey, string description, string caller)
  {
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(CacheItemAsync)}";

    try
    {
      await GetCacheContainer().UpsertItemAsync<T>(item, new PartitionKey(partitionKey));

      logger.LogInformation("{CallerId}: Cached {Description}.", callerId, description);
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: Failed to cache {Description}.", callerId, description);
    }
  }
}
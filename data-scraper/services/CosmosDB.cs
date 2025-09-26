using Microsoft.Azure.Cosmos;

namespace ScripturAI;

public class CosmosDBService
{
  static readonly CosmosClient dbClient = new(Environment.GetEnvironmentVariable("COSMOS_URL"), Environment.GetEnvironmentVariable("COSMOS_KEY"));

  public static async Task UpsertVerseAsync(Verse verse)
  {
    await dbClient.GetDatabase("ScripturAI").GetContainer("data").UpsertItemAsync(verse, new PartitionKey(verse.collection));
  }
}
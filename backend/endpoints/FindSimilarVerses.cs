using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;

namespace ScripturAI;

public class FindSimilarVerses
{
  private record CacheEntry(string id, string collection, List<SimilarVerse> verses);
  private record Verse(string verseId, string text, float[] vector);
  private record SimilarVerse(string verseId, string text);
  private readonly ILogger<FindSimilarVerses> _logger;

  public FindSimilarVerses(ILogger<FindSimilarVerses> logger)
  {
    _logger = logger;
  }

  [Function("FindSimilarVerses")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/similar")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      int verse
    )
  {
    _logger.LogInformation($"{nameof(FindSimilarVerses)}: Fetching similar verses to {book}:{chapter}:{verse}");

    try
    {
      string verseId = $"{book}:{chapter}:{verse}:{version}";
      string cachePartitionKey = $"{book}:SimilarVerses";
      ItemResponse<CacheEntry> cacheResponse;

      // check the cache first
      try
      {
        cacheResponse = await CosmosDBService.GetCacheContainer().ReadItemAsync<CacheEntry>(verseId, new PartitionKey(cachePartitionKey));
        if (cacheResponse.Resource != null)
        {
          _logger.LogInformation($"{nameof(FindSimilarVerses)}: Cache hit for {version}:{book}:{chapter}:{verse}.");
          
          // return the cached similar verses
          return new JsonResult(cacheResponse.Resource.verses);
        }
      }
      catch
      {
        // Log below
      }

      _logger.LogInformation($"{nameof(FindSimilarVerses)}: Cache miss for {version}:{book}:{chapter}:{verse}.");

      ItemResponse<Verse> verseResponse = await CosmosDBService.GetDataContainer().ReadItemAsync<Verse>(verseId, new PartitionKey(book));
      if (verseResponse.Resource == null)
      {
        _logger.LogWarning($"{nameof(FindSimilarVerses)}: {version}:{book}:{chapter}:{verse} not found.");

        return new NotFoundObjectResult("We are having trouble fetching similar verse. Please try again later.");
      }

      bool succeeded = int.TryParse(Environment.GetEnvironmentVariable("MAX_TOP_VECTOR"), out int maxTopVector);
      if (!succeeded || maxTopVector <= 0)
      {
        maxTopVector = 20; // default to 20 if not set or invalid
      }

      // Find top 5 similar verses using vector distance
      QueryDefinition query = new QueryDefinition(@"
        SELECT TOP @max c.verseId, c.text
        FROM c 
        WHERE c.version = @version AND c.id != @verseId
        ORDER BY VectorDistance(c.vector, @queryVector)
      ")
      .WithParameter("@max", maxTopVector)
      .WithParameter("@version", version)
      .WithParameter("@verseId", verseId)
      .WithParameter("@queryVector", verseResponse.Resource.vector);

      FeedIterator<SimilarVerse> iterator = CosmosDBService.GetDataContainer().GetItemQueryIterator<SimilarVerse>(query);

      List<SimilarVerse> verses = [];

      while (iterator.HasMoreResults)
      {
        verses.AddRange(await iterator.ReadNextAsync());
      }

      if (verses.Count == 0)
      {
        _logger.LogWarning($"{nameof(FindSimilarVerses)}: No similar verses found for {version}:{book}:{chapter}:{verse}.");

        return new NotFoundObjectResult("We are having trouble fetching similar verses. Please try again later.");
      }
      else
      {
        _logger.LogInformation($"{nameof(FindSimilarVerses)}: Found {verses.Count} similar verses for {version}:{book}:{chapter}:{verse}.");
      }

      // cache the similar verses
      try
      {
        await CosmosDBService.GetCacheContainer().UpsertItemAsync(new CacheEntry(verseId, cachePartitionKey, verses), new PartitionKey(cachePartitionKey));

        _logger.LogInformation($"{nameof(FindSimilarVerses)}: Cached similar verses for {version}:{book}:{chapter}:{verse}.");
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, $"{nameof(FindSimilarVerses)}: Failed to cache similar verses for {version}:{book}:{chapter}:{verse}.");
      }

      return new JsonResult(verses);
    }
    catch (Exception ex)
    {
      _logger.LogError(ex,  $"{nameof(FindSimilarVerses)}: An error occurred while searching for similar verses to {version}:{book}:{chapter}:{verse}.");
      
      return new ObjectResult("We are having trouble fetching similar verses. Please try again later.") { StatusCode = 500 };
    }
  }
}
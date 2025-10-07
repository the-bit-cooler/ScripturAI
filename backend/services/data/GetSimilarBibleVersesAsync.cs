using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal record SimilarVerse(string verseId, string text);
  private record SimilarVersesCacheEntry(string id, string collection, List<SimilarVerse> verses);

  /// <summary>
  /// Returns an empty array if no similar verses are found.
  /// </summary>
  internal async Task<List<SimilarVerse>> GetSimilarBibleVersesAsync(AiService.Mode mode, string version, string book, int chapter, int verse, string caller)
  {
    List<SimilarVerse> verses = [];
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(GetSimilarBibleVersesAsync)}";
    string verseId = $"{book}:{chapter}:{verse}:{version}";
    string cachePartitionKey = $"{book}:SimilarVerses:{mode}";
    string cacheDescription = $"similar verses for {verseId}";

    try
    {
      // check the cache first
      var cacheResponse = await GetCachedItemAsync<SimilarVersesCacheEntry>(verseId, cachePartitionKey, cacheDescription, callerId);
      if ((cacheResponse?.verses.Count ?? 0) > 0)
      {
        logger.LogInformation("{CallerId}: Found {Count} cached similar verses for {VerseId}.", callerId, cacheResponse!.verses.Count, verseId);

        return cacheResponse!.verses;
      }

      var selectedVerse = await GetBibleVerseAsync(verseId, book, callerId);
      if (selectedVerse == null)
      {
        logger.LogInformation("{CallerId}: Could not query for similar verses because {VerseId} was not found in database.", callerId, verseId);

        return verses;
      }

      QueryDefinition query = new QueryDefinition(@"
        SELECT TOP @max c.verseId, c.text
        FROM c 
        WHERE c.version = @version AND c.id != @verseId
        ORDER BY VectorDistance(c.vector, @queryVector)
      ")
      .WithParameter("@max", mode.GetMaxSimilarVerses())
      .WithParameter("@version", version)
      .WithParameter("@verseId", verseId)
      .WithParameter("@queryVector", selectedVerse.vector);

      FeedIterator<SimilarVerse> iterator = GetDataContainer().GetItemQueryIterator<SimilarVerse>(query);
      while (iterator.HasMoreResults)
      {
        verses.AddRange(await iterator.ReadNextAsync());
      }

      logger.LogInformation("{CallerId}: Found {Count} similar verses for {VerseId}.", callerId, verses.Count, verseId);

      if (verses.Count > 0)
      {
        // cache the similar verses
        await CacheItemAsync(new SimilarVersesCacheEntry(verseId, cachePartitionKey, verses), cachePartitionKey, cacheDescription, callerId);
      }
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: An error occurred while searching for similar verses to {VerseId}.", callerId, verseId);
    }

    return verses;
  }
}
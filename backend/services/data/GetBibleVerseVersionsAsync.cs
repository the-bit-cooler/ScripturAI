using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal record VerseVersion(string version, string book, int chapter, int verse, string text);

  /// <summary>
  /// Returns an empty array if no verse versions are found.
  /// </summary>
  internal async Task<List<VerseVersion>> GetBibleVerseVersionsAsync(string version, string book, int chapter, int verse, string caller)
  {
    List<VerseVersion> verses = [];
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(GetBibleVerseVersionsAsync)}";
    string docId = $"{book}:{chapter}:{verse}:{version}";

    try
    {
      QueryDefinition query = new QueryDefinition(@"
        SELECT c.verseId, c.version, c.book, c.chapter, c.verse, c.text
        FROM c 
        WHERE c.verseId = @verseId AND c.id != @docId
      ")
      .WithParameter("@verseId", $"{book}:{chapter}:{verse}")
      .WithParameter("@docId", docId);

      FeedIterator<VerseVersion> iterator = GetDataContainer().GetItemQueryIterator<VerseVersion>(query);
      while (iterator.HasMoreResults)
      {
        verses.AddRange(await iterator.ReadNextAsync());
      }

      logger.LogInformation("{CallerId}: Found {Count} verse versions for {DocId}.", callerId, verses.Count, docId);
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: An error occurred while searching for verse versions to {DocId}.", callerId, docId);
    }

    return verses;
  }
}
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal record BibleChapterVerse(string verseId, string version, string book, int chapter, int verse, string text);

  /// <summary>
  /// Returns an empty array if the bible chapter is not retrieved.
  /// </summary>
  internal async Task<List<BibleChapterVerse>> GetBibleChapterAsync(string version, string book, int chapter, string caller)
  {
    List<BibleChapterVerse> bibleChapter = [];
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(GetBibleChapterAsync)}";

    try
    {
      QueryDefinition chapterQuery = new QueryDefinition(@"
        SELECT c.verseId, c.version, c.book, c.chapter, c.verse, c.text 
        FROM c
        WHERE c.version = @version AND c.collection = @book AND c.chapter = @chapter
        ORDER BY c.verse
      ")
      .WithParameter("@version", version)
      .WithParameter("@book", book)
      .WithParameter("@chapter", chapter);

      FeedIterator<BibleChapterVerse> iterator = GetDataContainer().GetItemQueryIterator<BibleChapterVerse>(
        chapterQuery,
        requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(book) }
      );

      while (iterator.HasMoreResults)
      {
        bibleChapter.AddRange(await iterator.ReadNextAsync());
      }

      logger.LogInformation("{CallerId}: Retrieved {Count} verses for {Book}:{Chapter}.", callerId, bibleChapter.Count, book, chapter);
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: An error occurred while fetching {Book}:{Chapter}.", callerId, book, chapter);
    }

    return bibleChapter;
  }
}
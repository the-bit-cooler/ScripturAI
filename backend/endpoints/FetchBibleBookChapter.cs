using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;

namespace ScripturAI;

public class FetchBibleBookChapter
{
  private record Verse(string? verseId, string book, int chapter, int verse, string text);
  private readonly ILogger<FetchBibleBookChapter> _logger;

  public FetchBibleBookChapter(ILogger<FetchBibleBookChapter> logger)
  {
    _logger = logger;
  }

  [Function("FetchBibleBookChapter")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}")] HttpRequestData req,
      string version,
      string book,
      int chapter
    )
  {
    _logger.LogInformation($"{nameof(FetchBibleBookChapter)}: Fetching {version}:{book}:{chapter}");

    try
    {
      QueryDefinition query = new QueryDefinition(@"
        SELECT c.verseId, c.version, c.book, c.chapter, c.verse, c.text 
        FROM c 
        WHERE c.version = @version AND c.collection = @book AND c.chapter = @chapter 
        ORDER BY c.chapter, c.verse
      ")
      .WithParameter("@version", version)
      .WithParameter("@book", book)
      .WithParameter("@chapter", chapter);

      FeedIterator<Verse> iterator = CosmosDBService.GetDataContainer().GetItemQueryIterator<Verse>(
        query,
        requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(book) }
      );

      List<Verse> verses = [];

      while (iterator.HasMoreResults)
      {
        verses.AddRange(await iterator.ReadNextAsync());
      }

      if (verses.Count == 0)
      {
        _logger.LogWarning($"{nameof(FetchBibleBookChapter)}: {version}:{book}:{chapter} not found.");

        return new NotFoundObjectResult("We are having trouble fetching the chapter. Please try again later.");
      }
      else
      {
        _logger.LogInformation($"{nameof(FetchBibleBookChapter)}: Found {verses.Count} verses for {version}:{book}:{chapter}.");
      }

      return new JsonResult(verses);
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, $"{nameof(FetchBibleBookChapter)}: An error occurred while fetching {version}:{book}:{chapter}.");

      return new ObjectResult("We are having trouble fetching the chapter. Please try again later.") { StatusCode = 500 };
    }
  }
}
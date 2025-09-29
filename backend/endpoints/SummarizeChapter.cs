using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;
using OpenAI.Chat;
using System.ClientModel;

namespace ScripturAI;

public class SummarizeChapter
{
  private record CacheEntry(string id, string collection, string summary);
  private record ChapterVerse(string verseId, int verse, string text);
  private readonly ILogger<SummarizeChapter> _logger;

  public SummarizeChapter(ILogger<SummarizeChapter> logger)
  {
    _logger = logger;
  }

  [Function("SummarizeChapter")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/summarize/{mode?}")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      string mode = "detailed"
    )
  {
    _logger.LogInformation($"{nameof(SummarizeChapter)}: Fetching a summary for {version}:{book}:{chapter}.");

    try
    {
      string chapterId = $"{book}:{chapter}:{version}";
      string cachePartitionKey = $"{book}:Summary:{mode}";
      ItemResponse<CacheEntry> cacheResponse;

      // check the cache first
      try
      {
        cacheResponse = await CosmosDBService.GetCacheContainer().ReadItemAsync<CacheEntry>(chapterId, new PartitionKey(cachePartitionKey));
        if (cacheResponse.Resource != null)
        {
          _logger.LogInformation($"{nameof(SummarizeChapter)}: Cache hit for {version}:{book}:{chapter}.");

          // return the cached summary
          return new ContentResult
          {
            Content = cacheResponse.Resource.summary,
            ContentType = "text/plain",
            StatusCode = 200
          };
        }
      }
      catch
      {
        // Log below
      }

      _logger.LogInformation($"{nameof(SummarizeChapter)}: Cache miss for {version}:{book}:{chapter}.");

      // Get the chapter
      QueryDefinition chapterQuery = new QueryDefinition(@"
        SELECT c.verseId, c.verse, c.text
        FROM c
        WHERE c.version = @version AND c.collection = @book AND c.chapter = @chapter
        ORDER BY c.verse
      ")
      .WithParameter("@version", version)
      .WithParameter("@book", book)
      .WithParameter("@chapter", chapter);

      FeedIterator<ChapterVerse> chapterIterator = CosmosDBService.GetDataContainer().GetItemQueryIterator<ChapterVerse>(
        chapterQuery,
        requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(book) }
      );

      List<ChapterVerse> chapterVerses = [];

      while (chapterIterator.HasMoreResults)
      {
        chapterVerses.AddRange(await chapterIterator.ReadNextAsync());
      }

      List<ChatMessage> messages =
      [
        new SystemChatMessage("You are a helpful Bible-believing scholar that answers questions about the Bible using the provided verses as context."),
        new UserChatMessage($"Please give a {mode} summary of chapter {chapter} from the book of {book} in the {version} Bible: {string.Join(" | ", chapterVerses.Select(v => $"{v.verseId}: {v.text}"))}"),
      ];

      // send to chat client for summary
      ClientResult<ChatCompletion> response = await OpenAI.GetChatClient().CompleteChatAsync(messages);

      string summary = response.Value.Content[0].Text;

      // cache the summary
      try
      {
        await CosmosDBService.GetCacheContainer().UpsertItemAsync(new CacheEntry(chapterId, cachePartitionKey, summary), new PartitionKey(cachePartitionKey));

        _logger.LogInformation($"{nameof(SummarizeChapter)}: Cached summary for {version}:{book}:{chapter}.");
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, $"{nameof(SummarizeChapter)}: Failed to cache a summary for {version}:{book}:{chapter}.");
      }

      // return the summary
      return new ContentResult
      {
        Content = summary,
        ContentType = "text/plain",
        StatusCode = 200
      };
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, $"{nameof(SummarizeChapter)}: An error occurred while fetching a summary for {version}:{book}:{chapter}.");

      return new ObjectResult("We are having trouble fetching a summary. Please try again later.") { StatusCode = 500 };
    }
  }
}
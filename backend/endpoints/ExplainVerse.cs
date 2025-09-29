using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;
using OpenAI.Chat;
using System.ClientModel;

namespace ScripturAI;

public class ExplainVerse
{
  private record CacheEntry(string id, string collection, string explanation);
  private record Verse(string verseId, string text, float[] vector);
  private record ChapterVerse(string verseId, int verse, string text);
  private record SimilarVerse(string verseId, int verse, string text);
  private readonly ILogger<ExplainVerse> _logger;

  public ExplainVerse(ILogger<ExplainVerse> logger)
  {
    _logger = logger;
  }

  [Function("ExplainVerse")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/explain/{mode?}")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      int verse,
      string mode = "detailed"
    )
  {
    _logger.LogInformation($"{nameof(ExplainVerse)}: Fetching an explanation for {version}:{book}:{chapter}:{verse}.");

    try
    {
      string verseId = $"{book}:{chapter}:{verse}:{version}";
      string cachePartitionKey = $"{book}:Explanation:{mode}";
      ItemResponse<CacheEntry> cacheResponse;

      // check the cache first
      try
      {
        cacheResponse = await CosmosDBService.GetCacheContainer().ReadItemAsync<CacheEntry>(verseId, new PartitionKey(cachePartitionKey));
        if (cacheResponse.Resource != null)
        {
          _logger.LogInformation($"{nameof(ExplainVerse)}: Cache hit for {version}:{book}:{chapter}:{verse}.");

          // return the cached explanation
          return new ContentResult
          {
            Content = cacheResponse.Resource.explanation,
            ContentType = "text/plain",
            StatusCode = 200
          };
        }
      }
      catch
      {
        // Log below
      }

      _logger.LogInformation($"{nameof(ExplainVerse)}: Cache miss for {version}:{book}:{chapter}:{verse}.");

      ItemResponse<Verse> verseResponse = await CosmosDBService.GetDataContainer().ReadItemAsync<Verse>(verseId, new PartitionKey(book));
      if (verseResponse.Resource == null)
      {
        _logger.LogWarning($"{nameof(ExplainVerse)}: {version}:{book}:{chapter}:{verse} not found.");

        return new NotFoundObjectResult("We are having trouble fetching an explanation. Please try again later.");
      }

      // Get the chapter that the verse is in
      // This is to provide more context to the AI model
      QueryDefinition chapterQuery = new QueryDefinition(@"
        SELECT c.verseId, c.verse, c.text
        FROM c
        WHERE c.version = @version AND c.id != @verseId AND c.collection = @book AND c.chapter = @chapter
        ORDER BY c.verse
      ")
      .WithParameter("@version", version)
      .WithParameter("@verseId", verseId)
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

      bool succeeded = int.TryParse(Environment.GetEnvironmentVariable("MAX_TOP_VECTOR"), out int maxTopVector);
      if (!succeeded || maxTopVector <= 0)
      {
        maxTopVector = 20; // default to 20 if not set or invalid
      }

      // Find top 5 similar verses using vector distance
      QueryDefinition similarQuery = new QueryDefinition(@"
        SELECT TOP @max c.verseId, c.text
        FROM c 
        WHERE c.version = @version AND c.id != @verseId AND NOT (c.book = @book AND c.chapter = @chapter)
        ORDER BY VectorDistance(c.vector, @queryVector)
      ")
      .WithParameter("@max", maxTopVector)
      .WithParameter("@version", version)
      .WithParameter("@verseId", verseId)
      .WithParameter("@book", book)
      .WithParameter("@chapter", chapter)
      .WithParameter("@queryVector", verseResponse.Resource.vector);

      FeedIterator<SimilarVerse> similarIterator = CosmosDBService.GetDataContainer().GetItemQueryIterator<SimilarVerse>(similarQuery);

      List<SimilarVerse> similarVerses = [];

      while (similarIterator.HasMoreResults)
      {
        similarVerses.AddRange(await similarIterator.ReadNextAsync());
      }

      List<ChatMessage> messages =
      [
        new SystemChatMessage("You are a helpful Bible-believing scholar that answers questions about the Bible using the provided verses as context."),
        new UserChatMessage($"Please give a {mode} explanation of the following Bible verse: {book}:{chapter}:{verse} (from the {version} version of the Bible): \"{verseResponse.Resource.text}\""),
        new UserChatMessage($"Here are the other verses in the same chapter that may help provide context: {string.Join(" | ", chapterVerses.Select(v => $"{v.verseId}: {v.text}"))}"),
        new UserChatMessage($"Here are {similarVerses.Count} similar verses found elsewhere in the Bible: {string.Join(" | ", similarVerses.Select(v => $"{v.verseId}: {v.text}"))}"),
        new SystemChatMessage("While the person that you are helping does not know that other verses were supplied, you may or may not use or cite them in your explanation depending on how you were asked to explain.")
      ];

      // send to chat client for explanation
      ClientResult<ChatCompletion> response = await OpenAI.GetChatClient().CompleteChatAsync(messages);

      string explanation = response.Value.Content[0].Text;

      // cache the explanation
      try
      {
        await CosmosDBService.GetCacheContainer().UpsertItemAsync(new CacheEntry(verseId, cachePartitionKey, explanation), new PartitionKey(cachePartitionKey));

        _logger.LogInformation($"{nameof(ExplainVerse)}: Cached explanation for {version}:{book}:{chapter}:{verse}.");
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, $"{nameof(ExplainVerse)}: Failed to cache an explanation for {version}:{book}:{chapter}:{verse}.");
      }

      // return the explanation
      return new ContentResult
      {
        Content = explanation,
        ContentType = "text/plain",
        StatusCode = 200
      };
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, $"{nameof(ExplainVerse)}: An error occurred while fetching an explanation for {version}:{book}:{chapter}:{verse}.");

      return new ObjectResult("We are having trouble fetching an explanation. Please try again later.") { StatusCode = 500 };
    }
  }
}
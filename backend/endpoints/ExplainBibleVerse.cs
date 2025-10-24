using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class ExplainBibleVerse
{
  private readonly AiService aiService;

  public ExplainBibleVerse(AiService aiService)
  {
    this.aiService = aiService;
  }

  [Function("ExplainBibleVerse")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/explain/{mode}")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      int verse,
      string mode
    )
  {
    if (!Enum.TryParse(mode, true, out AiService.Mode aiMode))
      aiMode = AiService.Mode.Devotional; // default fallback
    
    string userPrompt = $"Explain {book}:{chapter}:{verse} from the {version} version of the Bible. Do not use a title with the verse reference or quote at the top of your GitHub markdown response. Just go right into your explanation.";
    string cacheId = $"{book}:{chapter}:{verse}:{version}";
    string cachePartitionKey = $"{book}:Explanation:{aiMode}";
    string cacheDescription = $"an explanation for {cacheId}";
    string callerId = $"{nameof(ExplainBibleVerse)}({aiMode})";

    return new ContentResult
    {
      Content = await aiService.GetChatCompletionAsync( //* returns an empty string if no chat is obtained
        aiMode,
        version,
        book,
        chapter,
        verse,
        userPrompt,
        includeBibleChapterContext: true,
        includeSimilarBibleVersesContext: true,
        cacheId,
        cachePartitionKey,
        cacheDescription,
        callerId
      ),
      ContentType = "text/plain",
      StatusCode = 200
    };
  }
}
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class SummarizeBibleChapter
{
  private readonly AiService aiService;

  public SummarizeBibleChapter(AiService aiService)
  {
    this.aiService = aiService;
  }

  [Function("SummarizeBibleChapter")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/summarize/{mode}")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      string mode
    )
  {
    if (!Enum.TryParse(mode, true, out AiService.Mode aiMode))
      aiMode = AiService.Mode.Devotional; // default fallback

    string userPrompt = $"Summarize {book} {chapter} from the {version} version of the Bible. At the top of your response (GitHub Markdown) use the following subtitle: Summary of {book} {chapter} ({version})";
    string cacheId = $"{book}:{chapter}:{version}";
    string cachePartitionKey = $"{book}:Summary:{aiMode}";
    string cacheDescription = $"a summary for {cacheId}";
    string callerId = $"{nameof(SummarizeBibleChapter)}({aiMode})";

    return new ContentResult
    {
      Content = await aiService.GetChatCompletionAsync( //* returns an empty string if no chat is obtained
        aiMode,
        version,
        book,
        chapter,
        verse: 0, // no verse necessary
        userPrompt,
        includeBibleChapterContext: true,
        includeSimilarBibleVersesContext: false,
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
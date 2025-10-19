using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class TranslateBibleVerseToModernEnglish
{
  private readonly AiService aiService;

  public TranslateBibleVerseToModernEnglish(AiService aiService)
  {
    this.aiService = aiService;
  }

  [Function("TranslateBibleVerseToModernEnglish")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/translate")] HttpRequestData req,
      string version,
      string book,
      int chapter,
      int verse
    )
  {
    string cacheId = $"{book}:{chapter}:{verse}:{version}";
    string cachePartitionKey = $"{book}:Translation";
    string cacheDescription = $"a translation for {cacheId}";
    string callerId = $"{nameof(TranslateBibleVerseToModernEnglish)}()";

    return new ContentResult
    {
      Content = await aiService.TranslateBibleVerseToModernEnglishAsync( //* returns an empty string if no chat is obtained
        version,
        book,
        chapter,
        verse,
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
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class GenerateBibleChapterImage
{
  private readonly AiService aiService;

  public GenerateBibleChapterImage(AiService aiService)
  {
    this.aiService = aiService;
  }

  [Function("GenerateBibleChapterImage")]
  public async Task<IActionResult> Run(
      [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/image")] HttpRequestData req,
      string version,
      string book,
      int chapter
  )
  {
    string callerId = $"{nameof(GenerateBibleChapterImage)}()";

    return new ContentResult
    {
      Content =  await aiService.GenerateBibleChapterImageAsync(
      version,
      book,
      chapter,
      callerId
    ),
      ContentType = "text/plain",
      StatusCode = 200
    };
  }
}
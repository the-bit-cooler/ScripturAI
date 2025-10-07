using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class FindSimilarBibleVerses
{
  private readonly DataService dataService;

  public FindSimilarBibleVerses(DataService dataService)
  {
    this.dataService = dataService;
  }

  [Function("FindSimilarBibleVerses")]
  public async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/similar/{mode}")] HttpRequestData req,
    string version,
    string book,
    int chapter,
    int verse,
    string mode
    )
  {
    if (!Enum.TryParse(mode, true, out AiService.Mode aiMode))
      aiMode = AiService.Mode.Devotional; // default fallback

    return new JsonResult(await dataService.GetSimilarBibleVersesAsync( //* returns an empty array if no similar verses are found
      aiMode,
      version,
      book,
      chapter,
      verse,
      caller: $"{nameof(FindSimilarBibleVerses)}({aiMode})"
    ));
  }
}
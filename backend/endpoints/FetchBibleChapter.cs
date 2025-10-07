using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class FetchBibleChapter
{
  private readonly DataService dataService;

  public FetchBibleChapter(DataService dataService)
  {
    this.dataService = dataService;
  }

  [Function("FetchBibleChapter")]
  public async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}")] HttpRequestData req,
    string version,
    string book,
    int chapter
    )
  {
    return new JsonResult(await dataService.GetBibleChapterAsync( //* returns an empty array if the bible chapter is not retrieved
      version,
      book,
      chapter,
      caller: $"{nameof(FetchBibleChapter)}()"
    ));
  }
}
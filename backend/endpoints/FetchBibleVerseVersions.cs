using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.AspNetCore.Mvc;
using ScripturAI.Services;

namespace ScripturAI;

public class FetchBibleVerseVersions
{
  private readonly DataService dataService;

  public FetchBibleVerseVersions(DataService dataService)
  {
    this.dataService = dataService;
  }

  [Function("FetchBibleVerseVersions")]
  public async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "bible/{version}/{book}/{chapter}/{verse}/versions")] HttpRequestData req,
    string version,
    string book,
    int chapter,
    int verse,
    string mode
    )
  {
    return new JsonResult(await dataService.GetBibleVerseVersionsAsync( //* returns an empty array if no verse versions are found
      version,
      book,
      chapter,
      verse,
      caller: $"{nameof(FetchBibleVerseVersions)}()"
    ));
  }
}
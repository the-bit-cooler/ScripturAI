using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ScripturAI;

public class FetchScripture
{
    private readonly ILogger<FetchScripture> _logger;

    public FetchScripture(ILogger<FetchScripture> logger)
    {
        _logger = logger;
    }

    [Function("FetchScripture")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequest req)
    {
        _logger.LogInformation("C# HTTP trigger function processed a request.");
        return new OkObjectResult("Welcome to Azure Functions!");
    }
}
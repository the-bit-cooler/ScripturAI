using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScripturAI.Services;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services
  .AddApplicationInsightsTelemetryWorkerService()
  .ConfigureFunctionsApplicationInsights()
  .AddSingleton<DataService>()
  .AddSingleton<AiService>();

builder.Build().Run();

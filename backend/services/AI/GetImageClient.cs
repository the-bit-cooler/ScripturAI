using OpenAI.Images;

namespace ScripturAI.Services;

public partial class AiService
{
  private readonly ImageClient imageClient = new(model: Environment.GetEnvironmentVariable("OPEN_AI_IMAGE_GENERATION_NAME"), apiKey: Environment.GetEnvironmentVariable("OPEN_AI_KEY"));

  internal ImageClient GetImageClient()
  {
    return imageClient;
  }
}
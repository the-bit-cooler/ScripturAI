using OpenAI.Chat;
using static ScripturAI.Services.AiService;

namespace ScripturAI.Services;

public static partial class ModeExtensions
{
  internal static ChatCompletionOptions GetChatCompletionOptions(this Mode mode)
  {
    return mode switch
    {
      Mode.Study => new ChatCompletionOptions
      {
        Temperature = 0.3f,
        TopP = 0.7f,
        MaxOutputTokenCount = 1000
      },
      Mode.Pastoral => new ChatCompletionOptions
      {
        Temperature = 0.4f,
        TopP = 0.8f,
        MaxOutputTokenCount = 3000
      },
      // Mode.Devotional
      _ => new ChatCompletionOptions
      {
        Temperature = 0.5f,
        TopP = 0.9f,
        MaxOutputTokenCount = 6000
      }
    };
  }
}
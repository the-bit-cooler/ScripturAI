using static ScripturAI.Services.AiService;

namespace ScripturAI.Services;

public static partial class ModeExtensions
{
  internal static int GetMaxSimilarVerses(this Mode mode)
  {
    return mode switch
    {
      Mode.Study => 15,
      Mode.Pastoral => 30,
      // Mode.Devotional
      _ => 5
    };
  }
}
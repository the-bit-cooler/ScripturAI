using static ScripturAI.Services.AiService;

namespace ScripturAI.Services;

public static partial class ModeExtensions
{
  internal static string GetDisplayName(this Mode mode)
  {
    return mode switch
    {
      Mode.Study => "Study Mode",
      Mode.Pastoral => "Deep Dive",
      // Mode.Devotional
      _ => "Simple Insight"
    };
  }
}
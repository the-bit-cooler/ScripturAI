using System.ClientModel;
using OpenAI.Chat;
using ScripturAI.Models;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static async Task TranslateToModern(List<Verse> batch)
  {
    foreach (var verse in batch)
    {
      ClientResult<ChatCompletion> response = await GetChatClient().CompleteChatAsync(
      [
        new SystemChatMessage("You are a Bible translation assistant. When given a verse from the King James Version (KJV), translate it into clear, natural modern English that accurately reflects the meaning of the original Hebrew, Aramaic, or Greek text. You may rephrase expressions to match their sense in the original languages while keeping the tone readable and faithful. Write in your own words with a style similar to modern translations like the NIV or NKJV, but do not copy from them. Return only the translated text—no verse numbers, commentary, book names, or explanations."),
        new UserChatMessage($"{verse.verseId}: {verse.text}.")
      ]);

      var chatCompletion = response.Value;

      if (chatCompletion == null) throw new Exception($"No response received.");
      if (chatCompletion.Content == null || chatCompletion.Content.Count == 0) throw new Exception($"Finish reason: {chatCompletion.FinishReason}.");

      verse.text = chatCompletion.Content[0].Text;
    }
  }
}
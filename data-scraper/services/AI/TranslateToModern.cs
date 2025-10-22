using System.ClientModel;
using OpenAI.Chat;
using ScripturAI.Models;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static async Task TranslateToModernAsync(List<Verse> batch)
  {
    foreach (var verse in batch)
    {
      int attempt = 1;
      const int MAX_ATTEMPTS = 3;

      try
      {
        while (true)
        {
          ClientResult<ChatCompletion> response = await GetChatClient().CompleteChatAsync(
          [
            new SystemChatMessage("You are a Bible translation assistant. When given a verse from the King James Version (KJV), translate it into clear, natural modern English that accurately reflects the meaning of the original Hebrew, Aramaic, or Greek text. You may rephrase expressions to match their sense in the original languages while keeping the tone readable and faithful. Write in your own words with a style similar to modern translations like the NIV or NKJV, but do not copy from them. Return only the translated text—no verse numbers, commentary, book names, or explanations."),
          new UserChatMessage($"{verse.verseId}: {verse.text}.")
          ]);

          var chatCompletion = response.Value;

          // --- Handle possible bad completions ---
          if (chatCompletion == null)
          {
            if (attempt >= MAX_ATTEMPTS)
            {
              await LogFailedVerseAsync(verse, "No response received.");
              verse.text = string.Empty;
              break;
            }
          }
          else if (chatCompletion.Content == null || chatCompletion.Content.Count == 0)
          {
            if (attempt >= MAX_ATTEMPTS)
            {
              await LogFailedVerseAsync(verse, $"Empty content. Finish reason: {chatCompletion.FinishReason}.");
              verse.text = string.Empty;
              break;
            }
          }
          else
          {
            verse.text = chatCompletion.Content[0].Text?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(verse.text))
            {
              await LogFailedVerseAsync(verse, "Received blank translation text.");
              verse.text = string.Empty;
            }

            break;
          }

          await Task.Delay(1000 * attempt);
          attempt++;
        }
      }
      catch (Exception ex)
      {
        await LogFailedVerseAsync(verse, ex.Message);
        verse.text = string.Empty;
      }
    }
  }
}
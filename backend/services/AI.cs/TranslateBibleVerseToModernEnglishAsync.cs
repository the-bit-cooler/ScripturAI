using System.ClientModel;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace ScripturAI.Services;

public partial class AiService
{
  internal async Task<string> TranslateBibleVerseToModernEnglishAsync(
    string version,
    string book,
    int chapter,
    int verse,
    string cacheId,
    string cachePartitionKey,
    string cacheDescription,
    string caller
  )
  {
    string chat = string.Empty;
    string callerId = $"{caller}->{nameof(AiService)}.{nameof(TranslateBibleVerseToModernEnglishAsync)}";

    try
    {
      string documentId = $"{book}:{chapter}:{verse}:{version}";

      var selectedVerse = await dataService.GetBibleVerseAsync(documentId, book, callerId);
      if (selectedVerse == null)
      {
        throw new Exception("Failed to get verse from database.");
      }

      int attempt = 1;
      const int MAX_ATTEMPTS = 3;

      while (true)
      {
        ClientResult<ChatCompletion> response = await GetChatClient().CompleteChatAsync(
        [
          new SystemChatMessage("You are a Bible translation assistant. When given a verse from the King James Version (KJV), translate it into clear, natural modern English that accurately reflects the meaning of the original Hebrew, Aramaic, or Greek text. You may rephrase expressions to match their sense in the original languages while keeping the tone readable and faithful. Write in your own words with a style similar to modern translations like the NIV or NKJV, but do not copy from them. Return only the translated text—no verse numbers, commentary, book names, or explanations."),
          new UserChatMessage($"{selectedVerse.verseId}: {selectedVerse.text}.")
        ]);

        var chatCompletion = response.Value;

        if (chatCompletion == null)
        {
          if (attempt >= MAX_ATTEMPTS)
            throw new Exception($"No response received. Retried model {attempt} times.");
        }
        else if (chatCompletion.Content == null || chatCompletion.Content.Count == 0)
        {
          if (attempt >= MAX_ATTEMPTS)
            throw new Exception($"Finish reason: {chatCompletion.FinishReason}. Retried model {attempt} times.");
        }
        else
        {
          chat = chatCompletion.Content[0].Text;

          break;
        }

        await Task.Delay(1000 * attempt);
        attempt++;
      }

      if (!string.IsNullOrWhiteSpace(chat))
      {
        // cache the translation
        await dataService.CacheItemAsync(new ChatCompletionCacheEntry(cacheId, cachePartitionKey, chat), cachePartitionKey, cacheDescription, callerId);
      }
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: An error occurred while fetching {description}.", callerId, cacheDescription);
    }

    return chat;
  }
}
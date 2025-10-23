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

      SystemChatMessage systemChatMessage = new(@"
        You are a Bible-believing translation assistant that always responds in GitHub-style Markdown. 
        When given a verse from an older bible version, translate it into clear, natural modern English that accurately reflects the meaning of the original Hebrew, Aramaic, or Greek text. 
        You may rephrase expressions to match their sense in the original languages while keeping the tone readable and faithful. 
        Write in your own words with a style similar to modern translations like the NIV or NKJV, but do not copy from them. 
        Return translated verse at the top of your response (no need to re-quote the original) and follow it with the reasoning behind your translation.
      ");

      int attempt = 1;
      const int MAX_ATTEMPTS = 3;

      while (true)
      {
        ClientResult<ChatCompletion> response = await GetChatClient().CompleteChatAsync(
        [
          systemChatMessage,
          new UserChatMessage($"{book} {chapter}:{verse} from the {version}: {selectedVerse.text}.")
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

      if (string.IsNullOrWhiteSpace(chat))
      {
        // fetch modern AI translation from database
        var modernTranslationVersion = await dataService.GetBibleVerseAsync(documentId.Replace(version, "MAIV"), book, callerId);
        if (modernTranslationVersion != null)
        {
          chat = modernTranslationVersion.text;
        }
      }
      else
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
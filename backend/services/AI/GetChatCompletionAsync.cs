using System.ClientModel;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace ScripturAI.Services;

public partial class AiService
{
  private record ChatCompletionCacheEntry(string id, string collection, string chat);

  /// <summary>
  /// Returns an empty string if no chat is obtained.
  /// </summary>
  internal async Task<string> GetChatCompletionAsync(
    Mode mode,
    string version,
    string book,
    int chapter,
    int verse,
    string userPrompt,
    bool includeBibleChapterContext,
    bool includeSimilarBibleVersesContext,
    string cacheId,
    string cachePartitionKey,
    string cacheDescription,
    string caller
  )
  {
    string chat = string.Empty;
    string callerId = $"{caller}->{nameof(AiService)}.{nameof(GetChatCompletionAsync)}";

    try
    {
      // check the cache first
      var cacheResponse = await dataService.GetCachedItemAsync<ChatCompletionCacheEntry>(cacheId, cachePartitionKey, cacheDescription, callerId);
      if (!string.IsNullOrWhiteSpace(cacheResponse?.chat))
      {
        return cacheResponse!.chat;
      }

      List<ChatMessage> messages =
      [
        mode.GetSystemBehavior(),
      ];

      if (includeBibleChapterContext)
      {
        var bibleChapter = await dataService.GetBibleChapterAsync(version, book, chapter, callerId);
        if ((bibleChapter?.Count ?? 0) > 0)
        {
          messages.Add(new SystemChatMessage($@"
            Full Bible Chapter from {version}: 
            {string.Join("\n", bibleChapter!.Select(v => $"{v.verseId}: {v.text}"))}
          "));
        }
      }

      if (includeSimilarBibleVersesContext)
      {
        var similarBibleVerses = await dataService.GetSimilarBibleVersesAsync(mode, version, book, chapter, verse, callerId);
        if ((similarBibleVerses?.Count ?? 0) > 0)
        {
          messages.Add(new SystemChatMessage($@"
            Similar Verses from {version}:
            {string.Join("\n", similarBibleVerses!.Select(v => $"{v.verseId}: {v.text}"))}
          "));
        }
      }

      messages.Add(new UserChatMessage(userPrompt));
      messages.Add(new UserChatMessage($"Mode: {mode.GetDisplayName()}. Focus level: {(mode == Mode.Pastoral ? "scholarly" : "educational")}."));

      int attempt = 1;
      const int MAX_ATTEMPTS = 3;

      while (true)
      {
        ClientResult<ChatCompletion> response = await GetChatClient().CompleteChatAsync(messages);

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
          chat = string.Join("\n", chatCompletion.Content
            .Where(c => !string.IsNullOrWhiteSpace(c.Text))
            .Select(c => c.Text));

          break;
        }

        await Task.Delay(1000 * attempt);
        attempt++;
      }

      if (!string.IsNullOrWhiteSpace(chat))
      {
        // cache the explanation
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
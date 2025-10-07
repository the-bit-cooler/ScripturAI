using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ScripturAI.Services;

public partial class DataService
{
  internal record BibleVerse(string verseId, string text, float[] vector);

  internal async Task<BibleVerse?> GetBibleVerseAsync(string verseId, string book, string caller)
  {
    string callerId = $"{caller}->{nameof(DataService)}.{nameof(GetBibleVerseAsync)}";

    try
    {
      ItemResponse<BibleVerse> response = await GetDataContainer().ReadItemAsync<BibleVerse>(verseId, new PartitionKey(book));
      if (response.Resource != null)
      {
        return response.Resource;
      }

      logger.LogWarning("{CallerId}: {VerseId} not found in database.", callerId, verseId);
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: An error occurred while fetching {VerseId}.", callerId, verseId);
    }

    return default;
  }
}
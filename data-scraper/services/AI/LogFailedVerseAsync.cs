using System.Text.Json;
using System.Text.Json.Serialization;
using ScripturAI.Models;

namespace ScripturAI.Services;

public partial class AiService
{
  private static readonly JsonSerializerOptions JsonOptions = new()
  {
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
  };

  private static readonly SemaphoreSlim LogLock = new(1, 1); // prevent concurrent writes

  private const string FailedTranslationsFile = "failed_translations.json";

  private static async Task LogFailedVerseAsync(Verse verse, string reason)
  {
    await LogLock.WaitAsync(); // ensure thread-safe writes
    try
    {
      FailedTranslation logEntry = new()
      {
        Verse = verse,
        Timestamp = DateTime.UtcNow,
        Reason = reason
      };

      List<FailedTranslation>? existingLogs = null;

      // 🧠 Read existing log file if it exists
      if (File.Exists(FailedTranslationsFile))
      {
        try
        {
          var existingJson = await File.ReadAllTextAsync(FailedTranslationsFile);
          if (!string.IsNullOrWhiteSpace(existingJson))
          {
            existingLogs = JsonSerializer.Deserialize<List<FailedTranslation>>(existingJson, JsonOptions);
          }
        }
        catch
        {
          // If corrupted or unreadable, start fresh
          existingLogs = null;
        }
      }

      existingLogs ??= new List<FailedTranslation>();
      existingLogs.Add(logEntry);

      // 💾 Rewrite full array
      var newJson = JsonSerializer.Serialize(existingLogs, JsonOptions);
      await File.WriteAllTextAsync(FailedTranslationsFile, newJson);
    }
    catch
    {
      // swallow logging errors — don't crash main process
    }
    finally
    {
      LogLock.Release();
    }
  }
}
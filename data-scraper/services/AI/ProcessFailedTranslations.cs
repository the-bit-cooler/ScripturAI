using System.Text.Json;
using ScripturAI.Models;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static async Task ProcessFailedTranslationsAsync()
  {
    await LogLock.WaitAsync(); // ensure thread-safe writes
    try
    {
      List<FailedTranslation>? existingLogs = null;

      // 🧠 Read existing log file if it exists
      if (File.Exists(FailedTranslationsFile))
      {
        try
        {
          var existingJson = await File.ReadAllTextAsync(FailedTranslationsFile);
          if (string.IsNullOrWhiteSpace(existingJson))
          {
            throw new Exception($"File {FailedTranslationsFile} empty.");
          }
          else
          {
            existingLogs = JsonSerializer.Deserialize<List<FailedTranslation>>(existingJson, JsonOptions);
            if (existingLogs is null || existingLogs.Count < 1)
            {
              throw new Exception($"File {FailedTranslationsFile} empty.");
            }
          }
        }
        catch
        {
          throw new Exception($"Could not open {FailedTranslationsFile}.");
        }
      }
      else
      {
        throw new Exception($"File {FailedTranslationsFile} does not exist.");
      }

      // Process verses
      List<Verse> verses = existingLogs
        .Select(log => log.Verse)
        .Where(v => v is not null)
        .Cast<Verse>()
        .ToList();

      await ProcessBatchEmbeddingsAsync(verses);

      // Empty file
      await File.WriteAllTextAsync(FailedTranslationsFile, string.Empty);
    }
    catch (Exception ex)
    {
      // swallow errors and let main process end gracefully
      Console.Error.WriteLine(ex.Message);
    }
    finally
    {
      LogLock.Release();
    }
  }
}
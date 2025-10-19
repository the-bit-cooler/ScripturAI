using System.Text.Json;
using ScripturAI.Models;
using ScripturAI.Services;

if (args.Length == 0)
{
  Console.WriteLine("Please provide a data source to scrape (e.g., kjv).");
  return;
}

switch (args[0].ToLower())
{
  case "kjv":
    await KJV();
    break;

  default:
    Console.WriteLine($"Unknown commandline arg: {args[0]}");
    break;
}

static async Task KJV()
{
  // Fetch list of book JSON files from GitHub repo aruljohn/Bible-kjv (while excluding Books.json)
  List<GitHubFileRef> githubFileList = await GitHubService.FetchGitHubFileListAsync("aruljohn/Bible-kjv", [".json"], ["Books.json"]);

  if (githubFileList.Count == 0)
  {
    Console.WriteLine("No files found to process.");
    return;
  }
  if (githubFileList.Count != 66)
  {
    Console.WriteLine($"Warning: Expected 66 books in KJV, but found {githubFileList.Count}.");
    return;
  }

  // Load or initialize processed books tracker
  const string processedFilePath = "processed_kjv_books.json";
  List<string> processedBooks = LoadProcessedBooks(processedFilePath);

  // Process each file one by one
  const int maxRetries = 3;
  const int batchSize = 100; // Adjust based on OpenAI rate limits

  foreach (var file in githubFileList)
  {
    if (string.IsNullOrEmpty(file.name))
    {
      Console.WriteLine("Skipping a file with no name.");
      continue;
    }

    string bookName = Path.GetFileNameWithoutExtension(file.name);
    if (processedBooks.Contains(bookName, StringComparer.OrdinalIgnoreCase))
    {
      Console.WriteLine($"Skipping {bookName} as it has already been processed.");
      continue;
    }

    // Load verses with retry
    List<Verse>? bookVerses = null;
    bool loadSuccess = await RetryAsync(async () =>
    {
      bookVerses = await GitHubService.LoadKjvBibleBookJson(file.download_url, file.name);
    }, maxRetries);

    if (!loadSuccess || bookVerses == null || bookVerses.Count == 0)
    {
      Console.WriteLine($"Failed to load verses for {bookName} after {maxRetries} retries.");
      continue;
    }

    // Process in batches with retry
    bool allBatchesSucceeded = true;
    for (int i = 0; i < bookVerses.Count; i += batchSize)
    {
      var batch = bookVerses.GetRange(i, Math.Min(batchSize, bookVerses.Count - i));
      bool batchSuccess = await RetryAsync(() => AiService.ProcessBatchEmbeddings(batch), maxRetries);
      if (!batchSuccess)
      {
        Console.WriteLine($"Failed to process batch starting at index {i} for {bookName} after {maxRetries} retries.");
        allBatchesSucceeded = false;
        break; // Stop processing this book to avoid partial uploads; manual intervention needed
      }
    }

    if (allBatchesSucceeded)
    {
      processedBooks.Add(bookName);
      SaveProcessedBooks(processedFilePath, processedBooks);
      Console.WriteLine($"Completed processing {bookName}.");
    }
    else
    {
      Console.WriteLine($"Partial failure in {bookName}; not marking as processed.");
    }
  }
}

static List<string> LoadProcessedBooks(string filePath)
{
  if (File.Exists(filePath))
  {
    try
    {
      string json = File.ReadAllText(filePath);
      return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Error loading processed books: {ex.Message}. Starting fresh.");
    }
  }
  return new List<string>();
}

static void SaveProcessedBooks(string filePath, List<string> processedBooks)
{
  try
  {
    string json = JsonSerializer.Serialize(processedBooks);
    File.WriteAllText(filePath, json);
  }
  catch (Exception ex)
  {
    Console.WriteLine($"Error saving processed books: {ex.Message}.");
  }
}

static async Task<bool> RetryAsync(Func<Task> action, int maxRetries)
{
  for (int attempt = 1; attempt <= maxRetries; attempt++)
  {
    try
    {
      await action();
      return true;
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Attempt {attempt} failed: {ex.Message}");
      if (attempt == maxRetries)
      {
        return false;
      }
      await Task.Delay(1000 * attempt); // Exponential backoff in ms
    }
  }
  return false;
}
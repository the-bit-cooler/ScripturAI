using System.Text.Json;
using ScripturAI.Models;
using ScripturAI.Services;

string task = args.Length > 0 ? args[0].ToLower() : "ScrollMapper";
switch (task)
{
  case "kjv":
    await KJV();
    break;

  case "modern":
    await ModernTranslation();
    break;

  case "failed":
    await Resubmit();
    break;

  default:
    Console.Write("Enter a valid bible version: ");
    string? version = Console.ReadLine();
    if (string.IsNullOrWhiteSpace(version))
    {
      Console.WriteLine("Please provide valid bible version to scrape from ScrollMapper GitHub.");
      return;
    }
    await ScrollMapper(version);
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
      bool batchSuccess = await RetryAsync(() => AiService.ProcessBatchEmbeddingsAsync(batch), maxRetries);
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

static async Task ScrollMapper(string version)
{
  ScrollMapperBiblicalBooks? bible = await GitHubService.FetchScrollMapperBibleAsync(version);
  if (bible is null || bible.books.Count < 1)
  {
    Console.WriteLine($"{nameof(GitHubService)}.{nameof(GitHubService.FetchScrollMapperBibleAsync)}({version}): Nothing to process.");
    return;
  }

  // Load or initialize processed books tracker
  string processedFilePath = $"processed_{bible.version!.ToLower().Replace(" ", "_")}_books.json";
  List<string> processedBooks = LoadProcessedBooks(processedFilePath);

  // Process each file one by one
  const int maxRetries = 3;
  const int batchSize = 100; // Adjust based on OpenAI rate limits

  foreach (var bibleBook in bible.books)
  {
    if (string.IsNullOrEmpty(bibleBook.name))
    {
      Console.WriteLine($"Skipping a book with no name.");
      continue;
    }

    if (!BibleBookMap.Map.TryGetValue(bibleBook.name, out string? bibleBookName))
    {
        Console.WriteLine($"Unknown book: {bibleBook.name}");
    }

    if (processedBooks.Contains(bibleBookName, StringComparer.OrdinalIgnoreCase))
    {
      Console.WriteLine($"Skipping {bibleBookName} as it has already been processed.");
      continue;
    }

    // Load verses with retry
    List<Verse> bookVerses = [];
    foreach (var ch in bibleBook.chapters)
    {
      foreach (var v in ch.verses)
      {
        bookVerses.Add(new Verse
        {
          id = $"{bibleBookName}:{ch.chapter}:{v.verse}:{bible.version}",
          verseId = $"{bibleBookName}:{ch.chapter}:{v.verse}",
          version = bible.version,
          collection = bibleBookName,
          book = bibleBookName,
          chapter = ch.chapter,
          verse = v.verse,
          text = v.text?.Trim(),
        });
      }
    }

    // Process in batches with retry
    bool allBatchesSucceeded = true;
    for (int i = 0; i < bookVerses.Count; i += batchSize)
    {
      var batch = bookVerses.GetRange(i, Math.Min(batchSize, bookVerses.Count - i));
      bool batchSuccess = await RetryAsync(() => AiService.ProcessBatchEmbeddingsAsync(batch), maxRetries);
      if (!batchSuccess)
      {
        Console.WriteLine($"Failed to process batch starting at index {i} for {bibleBookName} for {bible.version} after {maxRetries} retries.");
        allBatchesSucceeded = false;
        break; // Stop processing this book to avoid partial uploads; manual intervention needed
      }
    }

    if (allBatchesSucceeded)
    {
      processedBooks.Add(bibleBookName!);
      SaveProcessedBooks(processedFilePath, processedBooks);
      Console.WriteLine($"Completed processing {bibleBookName} for {bible.version}.");
    }
    else
    {
      Console.WriteLine($"Partial failure in {bibleBookName} for {bible.version}; not marking as processed.");
    }
  }
}

static async Task ModernTranslation()
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
  const string processedFilePath = "processed_modern_translation_books.json";
  List<string> processedBooks = LoadProcessedBooks(processedFilePath);
  const string progressFilePath = "modern_translation_batch_progress.json";
  Dictionary<string, BookProgress> bookProgress = LoadBookProgress(progressFilePath);

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
      bookVerses = await GitHubService.LoadKjvBibleBookJson(file.download_url, file.name, isForModernTranslation: true);
    }, maxRetries);

    if (!loadSuccess || bookVerses == null || bookVerses.Count == 0)
    {
      Console.Error.WriteLine($"Failed to load verses for {bookName} after {maxRetries} retries.");
      continue;
    }

    // Process in batches with retry
    bool allBatchesSucceeded = true;
    int startIndex = 0;

    if (bookProgress.TryGetValue(bookName, out var progress))
    {
      startIndex = progress.LastBatchStart + batchSize; // resume after last completed batch
    }

    Console.WriteLine($"Starting to process {batchSize} batch from index {startIndex} for {bookName}.");

    for (int i = startIndex; i < bookVerses.Count; i += batchSize)
    {
      var batch = bookVerses.GetRange(i, Math.Min(batchSize, bookVerses.Count - i));
      bool batchSuccess = await RetryAsync(() => AiService.TranslateToModernAsync(batch), maxRetries);
      if (!batchSuccess)
      {
        Console.Error.WriteLine($"AiService.TranslateToModern: Failed to process {batchSize} batch from index {i} for {bookName} after {maxRetries} retries.");
        allBatchesSucceeded = false;
        break; // Stop processing this book to avoid partial uploads; manual intervention needed
      }
      batchSuccess = await RetryAsync(() => AiService.ProcessBatchEmbeddingsAsync(batch), maxRetries);
      if (!batchSuccess)
      {
        Console.Error.WriteLine($"AiService.ProcessBatchEmbeddings: Failed to process {batchSize} batch from index {i} for {bookName} after {maxRetries} retries.");
        allBatchesSucceeded = false;
        break; // Stop processing this book to avoid partial uploads; manual intervention needed
      }

      Console.WriteLine($"Completed processing {batchSize} batch from index {i} for {bookName}.");

      // ✅ Save progress after each successful batch
      bookProgress[bookName] = new BookProgress { LastBatchStart = i };
      SaveBookProgress(progressFilePath, bookProgress);
    }

    if (allBatchesSucceeded)
    {
      processedBooks.Add(bookName);
      SaveProcessedBooks(processedFilePath, processedBooks);

      // ✅ Remove book from progress file (cleanup)
      if (bookProgress.ContainsKey(bookName))
      {
        bookProgress.Remove(bookName);
        SaveBookProgress(progressFilePath, bookProgress);
      }

      Console.WriteLine($"Completed processing {bookName}.");

      // ✅ Eject after a book finishes as this process can take an hour or longer per book
      return;
    }
    else
    {
      Console.Error.WriteLine($"Partial failure in {bookName}; not marking as processed.");
    }
  }
}

static async Task Resubmit()
{
  await AiService.ProcessFailedTranslationsAsync();
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

static Dictionary<string, BookProgress> LoadBookProgress(string filePath)
{
  if (File.Exists(filePath))
  {
    try
    {
      string json = File.ReadAllText(filePath);
      return JsonSerializer.Deserialize<Dictionary<string, BookProgress>>(json)
        ?? new Dictionary<string, BookProgress>();
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Error loading book progress: {ex.Message}. Starting fresh.");
    }
  }
  return new Dictionary<string, BookProgress>();
}

static void SaveBookProgress(string filePath, Dictionary<string, BookProgress> progress)
{
  try
  {
    string json = JsonSerializer.Serialize(progress, new JsonSerializerOptions { WriteIndented = true });
    File.WriteAllText(filePath, json);
  }
  catch (Exception ex)
  {
    Console.WriteLine($"Error saving book progress: {ex.Message}.");
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
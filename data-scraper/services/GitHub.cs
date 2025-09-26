using System.Net.Http.Json;

namespace ScripturAI;

public class GitHubService
{
  public static async Task<List<GitHubFileRef>> FetchGitHubFileListAsync(string repo, List<string> includeExtensions, List<string>? excludeFiles = null)
  {
    List<GitHubFileRef> fileList = [];
    try
    {
      using HttpClient httpClient = new();

      // GitHub API requires User-Agent
      httpClient.DefaultRequestHeaders.Add("User-Agent", "ScripturAI");

      var response = await httpClient.GetFromJsonAsync<List<GitHubFileRef>>($"https://api.github.com/repos/{repo}/contents");
      var data = response?.ToList();

      if (data != null)
      {
        if (includeExtensions.Count > 0)
        {
          data = [.. data.Where(f => includeExtensions.Any(ext => f.name?.EndsWith(ext, StringComparison.OrdinalIgnoreCase) == true))];
        }
        if (excludeFiles != null && excludeFiles.Count > 0)
        {
          data = [.. data.Where(f => !excludeFiles.Contains(f.name ?? string.Empty, StringComparer.OrdinalIgnoreCase))];
        }

        fileList = data;
      }
    }
    catch (Exception ex)
    {
      Console.WriteLine($"{nameof(GitHubService)}.{FetchGitHubFileListAsync}: Error fetching file refs from GitHub: {ex.Message}");
    }

    return fileList;
  }

  public static async Task<List<Verse>> LoadKjvBibleBookJson(string? downloadUrl, string? fileName)
  {
    if (string.IsNullOrEmpty(downloadUrl) || string.IsNullOrEmpty(fileName))
    {
      throw new ArgumentException($"{nameof(GitHubService)}.{LoadKjvBibleBookJson}: Download URL or file name is null or empty.");
    }

    using HttpClient httpClient = new();

    // GitHub API requires User-Agent
    httpClient.DefaultRequestHeaders.Add("User-Agent", "ScripturAI");

    var book = await httpClient.GetFromJsonAsync<KjvBibleBook>(downloadUrl);
    if (book == null || string.IsNullOrEmpty(book.book) || book.chapters == null)
    {
      throw new ArgumentException($"{nameof(GitHubService)}.{LoadKjvBibleBookJson}: Failed to parse {fileName}.");
    }

    var verses = new List<Verse>();
    foreach (var chapter in book.chapters)
    {
      if (!int.TryParse(chapter.chapter, out int chapterNum) || chapter.verses == null)
        throw new ArgumentException($"{nameof(GitHubService)}.{LoadKjvBibleBookJson}: Invalid chapter data in {fileName}.");

      foreach (var verseRaw in chapter.verses)
      {
        if (!int.TryParse(verseRaw.verse, out int verseNum) || string.IsNullOrEmpty(verseRaw.text))
          throw new ArgumentException($"{nameof(GitHubService)}.{LoadKjvBibleBookJson}: Invalid verse data in {fileName} at chapter {chapter.chapter}.");

        var verse = new Verse
        {
          id = $"{book.book}:{chapter.chapter}:{verseRaw.verse}:KJV",
          verseId = $"{book.book}:{chapter.chapter}:{verseRaw.verse}",
          version = "KJV",
          collection = book.book,
          book = book.book,
          chapter = chapterNum,
          verse = verseNum,
          text = verseRaw.text.Trim(),
        };
        verses.Add(verse);
      }
    }

    if (verses.Count == 0)
    {
      throw new ArgumentException($"{nameof(GitHubService)}.{LoadKjvBibleBookJson}: No verses found in {fileName}.");
    }

    return verses;
  }
}
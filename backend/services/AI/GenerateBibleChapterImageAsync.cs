using Microsoft.Extensions.Logging;
using OpenAI.Images;

namespace ScripturAI.Services;

public partial class AiService
{
  private readonly TimeSpan imageTtl = TimeSpan.FromDays(180);

  internal async Task<string> GenerateBibleChapterImageAsync(
    string version,
    string book,
    int chapter,
    string caller
  )
  {
    string finalUrl = string.Empty;
    string callerId = $"{caller}->{nameof(AiService)}.{nameof(GenerateBibleChapterImageAsync)}";

    try
    {
      var blobClient = (await dataService.GetBlobContainer()).GetBlobClient($"{version}/{book}/{chapter}.png".Replace(" ", "_"));

      // 3️⃣ Check if blob exists and is fresh
      if (await blobClient.ExistsAsync())
      {
        var properties = await blobClient.GetPropertiesAsync();
        var lastModified = properties.Value.LastModified.UtcDateTime;
        var age = DateTime.UtcNow - lastModified;

        if (age < imageTtl)
        {
          logger.LogInformation("{CallerId}: Found existing image for {Book} {Chapter} (Age {AgeDays:F1} days)", callerId, book, chapter, age.TotalDays);

          return blobClient.Uri.ToString();
        }

        logger.LogInformation("{CallerId}: Image for {Book} {Chapter} expired ({AgeDays:F1} days). Regenerating.", callerId, book, chapter, age.TotalDays);
      }

      ChatCompletionCacheEntry? cachedSummary = await dataService.GetCachedItemAsync<ChatCompletionCacheEntry>(
        $"{book}:{chapter}:{version}",
        $"{book}:Summary:{AiService.Mode.Devotional}",
        "",
        callerId)
      ;

      string summary = (cachedSummary is null)
        ? string.Empty
        : $@"
          Use the following context to guide your composition:
          {cachedSummary.chat}
        ";

      string prompt = $@"
        Create a detailed, reverent, classical-style image representing the main themes of {book} chapter {chapter} from the Bible.
        Avoid modern elements or text. 
        {summary}
      ";

#pragma warning disable OPENAI001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
      GeneratedImage image = await GetImageClient().GenerateImageAsync(
        prompt,
        new ImageGenerationOptions
        {
          Size = GeneratedImageSize.W1536xH1024
        }
      );
#pragma warning restore OPENAI001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

      // 5️⃣ Upload to AzureWebJobsStorage
      using var stream = new MemoryStream();

      image.ImageBytes.ToStream().CopyTo(stream);
      stream.Position = 0;

      await blobClient.UploadAsync(stream, overwrite: true);

      finalUrl = blobClient.Uri.ToString();

      logger.LogInformation("{CallerId}: Uploaded new image for {Book} {Chapter} to shared storage.", callerId, book, chapter);
    }
    catch (Exception ex)
    {
      logger.LogError(ex, "{CallerId}: Failed to generate or store image for {Book} {Chapter}.", callerId, book, chapter);
    }

    return finalUrl;
  }
}
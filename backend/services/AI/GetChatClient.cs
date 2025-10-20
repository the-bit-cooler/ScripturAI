using OpenAI.Chat;

namespace ScripturAI.Services;

public partial class AiService
{
  internal ChatClient GetChatClient()
  {
    return client.GetChatClient(Environment.GetEnvironmentVariable("OPEN_AI_CHAT_NAME")!);
  }
}
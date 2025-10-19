using OpenAI.Chat;

namespace ScripturAI.Services;

public partial class AiService
{
  internal static ChatClient GetChatClient()
  {
    return aIClient.GetChatClient(Environment.GetEnvironmentVariable("OPEN_AI_CHAT_NAME")!);
  }
}
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { marked } from "marked";
import { Alert } from "react-native";

export async function shareMarkdownAsPdf(
  markdown: string,
  title: string,
  aiMode: string
) {
  try {
    // Convert Markdown → HTML
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 40px; }
            body {
              font-family: -apple-system, Roboto, sans-serif;
              color: #222;
              background-color: white;
              ine-height: 1.5;
            }
            h1 {
              text-align: center;
              font-size: 32px;
              margin-bottom: 5px;
              color: #0366d6;
            }
            h2 {
              text-align: center;
              font-size: 24px;
              margin-top: 0;
              margin-bottom: 20px;
              color: #555;
            }
            pre {
              background-color: #f6f8fa;
              padding: 10px;
              border-radius: 6px;
              overflow-x: auto;
            }
            code {
              font-family: Menlo, monospace;
            }
            h3, h4 {
              color: #0366d6;
            }
            p {
              margin-bottom: 12px;
            }
            @page {
              @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 12px;
                color: #666;
              }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>AI ${aiMode} Mode</h2>
          <hr />
          ${marked.parse(markdown)}
        </body>
      </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });

    // Share the temp file directly
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      console.log("Sharing not available; PDF temp file at:", uri);
      Alert.alert(`Sorry, Sharing not available.`);
    }
  } catch (err) {
    Alert.alert('We are unable to share this at the moment. Please try again at another time.')
    console.error("Error generating or sharing PDF:", err);
  }
}
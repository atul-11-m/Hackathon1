// ✅ Replace with your API Key 2 (inside quotes)
const GEMINI_API_KEY = "AIzaSyB6g1Uuq3oHyfl6F7u5PmoEw8Q0hHH7op8";

// Difficulty levels
const levels = [
  { id: "level-5", title: "Explain like I'm 5" },
  { id: "level-middle", title: "Middle School" },
  { id: "level-high", title: "High School" },
  { id: "level-uni", title: "University" },
  { id: "level-phd", title: "PhD" }
];

// Create context menu with sub-options
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "rootExplain",
    title: "Explain this text...",
    contexts: ["selection"]
  });

  levels.forEach(level => {
    chrome.contextMenus.create({
      id: level.id,
      parentId: "rootExplain",
      title: level.title,
      contexts: ["selection"]
    });
  });
});

// When user clicks a level
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const level = levels.find(l => l.id === info.menuItemId);
  if (level && info.selectionText) {
    const explanation = await explainAtLevel(info.selectionText, level.title);

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text, level) => alert(`(${level}) Explanation:\n\n${text}`),
      args: [explanation, level.title]
    });
  }
});

// Function that calls Gemini API
async function explainAtLevel(text, level) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Paraphrase the following text using easier vocabulary at a ${level} reading level. 
Keep it in one clear sentence:\n\n${text}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini API response:", data);

    if (!response.ok) {
      return `Error ${response.status}: ${data.error?.message || "Unknown error"}`;
    }

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No paraphrase found."
    );
  } catch (err) {
    console.error("Fetch failed:", err);
    return "Error connecting to Gemini API.";
  }
}
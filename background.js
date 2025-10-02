const GEMINI_API_KEY = "AIzaSyB6g1Uuq3oHyfl6F7u5PmoEw8Q0hHH7op8";

//setting the various difficulty levels 
const levels = [
  { id: "level-5", title: "Explain like I'm 5" },
  { id: "level-middle", title: "Middle School" },
  { id: "level-high", title: "High School" },
  { id: "level-uni", title: "University" },
  { id: "level-phd", title: "PhD" }
];

//creating the context menu
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

//scripting the click action for a particular level
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const level = levels.find(l => l.id === info.menuItemId);
  if (level && info.selectionText) {
    const explanation = await explainAtLevel(info.selectionText, level.title);

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text, level) => {

        //initializing popup window
        const box = document.createElement('div');
        box.id = 'explainBox';
        box.innerHTML = `<strong>${level}:</strong> ${text}`;

        
                
        //setting box styles
        box.style.setProperty('font-family', '"Lucida Console", "Courier New", monospace;');
        box.style.position = 'fixed';
        box.style.bottom = '20px';
        box.style.right = '20px';
        box.style.background = 'rgb(235, 221, 199)';
        box.style.border = '2px solid #333';
        box.style.borderRadius = '8px';
        box.style.padding = '15px';
        box.style.boxShadow = '0 4px 10px rgba(109, 179, 79, 0.2)';
        box.style.maxWidth = '500px';
        box.style.height = '500px';
        box.style.zIndex = 9999;
        box.style.fontSize = '14px';
        box.style.color = 'rgb(2, 80, 86)';
        
        //close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✖';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.float = 'right';
        closeBtn.style.marginLeft = '10px';
        closeBtn.addEventListener('click', () => box.remove());
        box.prepend(closeBtn);

        document.body.appendChild(box);
      },
      args: [explanation, level.title]
    });
  }
});

//calling the gemini api
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

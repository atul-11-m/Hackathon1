const GEMINI_API_KEY = "AIzaSyB6g1Uuq3oHyfl6F7u5PmoEw8Q0hHH7op8";

//defining all the difficulty levels 
const levels = [
  { id: "level-5", title: "Explain like I'm 5" },
  { id: "level-middle", title: "Middle School" },
  { id: "level-high", title: "High School" },
  { id: "level-uni", title: "University" },
  { id: "level-phd", title: "PhD" }
];

//adding the menu to select the context level
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

//scripting clicks for levels
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const level = levels.find(l => l.id === info.menuItemId);
  if (!level || !info.selectionText) return;

  const explanation = await explainAtLevel(info.selectionText, level.title);

  //saving explanation
  chrome.storage.local.get("explanations", (data) => {
    const items = data.explanations || [];
    items.push({ level: level.title, text: explanation });
    chrome.storage.local.set({ explanations: items }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectUI,
        args: [explanation, level.title]
      });
    });
  });
});

//created the injected ui
function injectUI(text, levelTitle) {
  

  //explanation box 
  const box = document.createElement("div");
  box.id = "explainBox";
  box.innerHTML = `<strong>${levelTitle}:</strong> ${text}<br><br>`;

  //stlying the box
  Object.assign(box.style, {
    fontFamily: '"Lucida Console", "Courier New", monospace',
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "rgb(235, 221, 199)",
    border: "2px solid #333",
    borderRadius: "8px",
    padding: "15px",
    boxShadow: "0 4px 10px rgba(109, 179, 79, 0.2)",
    maxWidth: "500px",
    height: "500px",
    overflowY: "auto",
    zIndex: 9999,
    fontSize: "14px",
    color: "rgb(2, 80, 86)"
  });

  //X button
  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✖";
  Object.assign(closeBtn.style, {
    cursor: "pointer",
    float: "right",
    marginLeft: "10px"
  });
  closeBtn.addEventListener("click", () => box.remove());
  box.prepend(closeBtn);

  //creating a button to view saved searches 
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "📂 View Saved";
  Object.assign(viewBtn.style, {
    marginTop: "10px",
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    background: "#2a8",
    color: "white",
    cursor: "pointer"
  });
  box.appendChild(viewBtn);

  //scripting click for the saved search box
  viewBtn.addEventListener("click", () => {
    if (document.getElementById("savedBox")) return;

    const savedBox = document.createElement("div");
    savedBox.id = "savedBox";

    Object.assign(savedBox.style, {
      position: "fixed",
      bottom: "20px",
      right: "540px",
      width: "400px",
      maxHeight: "500px",
      overflowY: "auto",
      background: "rgb(245, 245, 245)",
      border: "2px solid #333",
      borderRadius: "8px",
      padding: "10px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
      fontFamily: '"Lucida Console", "Courier New", monospace',
      fontSize: "13px",
      color: "#222",
      zIndex: 9999
    });

    //X for saved box
    const closeSaved = document.createElement("span");
    closeSaved.textContent = "✖";
    Object.assign(closeSaved.style, {
      cursor: "pointer",
      float: "right",
      marginLeft: "10px"
    });
    closeSaved.addEventListener("click", () => savedBox.remove());
    savedBox.prepend(closeSaved);

    //fetching saved explanations
    chrome.storage.local.get("explanations", (data) => {
      const items = data.explanations || [];
      if (items.length === 0) {
        savedBox.innerHTML += "<em>No saved explanations yet.</em>";
      } else {
        items.forEach(e => {
          const div = document.createElement("div");
          div.style.marginBottom = "8px";
          div.innerHTML = `<strong>${e.level}:</strong> ${e.text}`;
          savedBox.appendChild(div);
        });
      }
    });

    document.body.appendChild(savedBox);
  });

  document.body.appendChild(box);
}

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
                  text: `Paraphrase the following text using easier vocabulary at a ${level} reading level. Keep it in one clear sentence:\n\n${text}`
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

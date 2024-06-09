document.addEventListener("DOMContentLoaded", () => {
    const url = window.location.href;
    chrome.storage.sync.get([url], (result) => {
        if (result[url]) {
            applyAnnotations(result[url]);
        }
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "openNotePopup") {
        const noteId = message.noteId;
        chrome.storage.sync.get([noteId], function (result) {
            const annotation = result[noteId];
            if (annotation) {
                chrome.storage.sync.set({ currentNote: annotation });
                chrome.runtime.sendMessage({ action: "showNotePopup" });
            }
        });
    }
});

function applyAnnotations(annotations) {
    annotations.forEach(annotation => {
        const range = document.createRange();
        const startNode = document.evaluate(annotation.startXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const endNode = document.evaluate(annotation.endXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        range.setStart(startNode, annotation.startOffset);
        range.setEnd(endNode, annotation.endOffset);

        const span = document.createElement("span");
        span.style.backgroundColor = annotation.color;
        span.classList.add("annotated-text");
        span.dataset.noteId = annotation.noteId;
        span.onclick = () => {
            chrome.storage.sync.get([annotation.noteId], (result) => {
                alert(result[annotation.noteId].note || "No note available.");
            });
        };
        range.surroundContents(span);
    });
}




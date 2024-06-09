chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "addNote",
        title: "Add Note",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addNote" && info.selectionText) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: addNote,
            args: [info.selectionText]
        });
    }
});

function addNote(selectionText) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const startXPath = getXPathForElement(range.startContainer);
    const endXPath = getXPathForElement(range.endContainer);
    const noteId = Date.now().toString();

    const annotation = {
        text: selectionText,
        noteId,
        date: new Date().toISOString().split('T')[0],
        category: "",
        keywords: "",
        note: "",
        color: "#ffcc00", // Default highlight color
        startXPath,
        startOffset: range.startOffset,
        endXPath,
        endOffset: range.endOffset,
        url: window.location.href
    };

    chrome.storage.sync.get([annotation.url], (result) => {
        const annotations = result[annotation.url] || [];
        annotations.push(annotation);
        chrome.storage.sync.set({ [annotation.url]: annotations }, () => {
            chrome.runtime.sendMessage({ action: "openNotePopup", noteId });
            highlightText(annotation);
        });
    });
}

function getXPathForElement(element) {
    const idx = (sib, name) => sib ? idx(sib.previousElementSibling, name || sib.localName) + (sib.localName === name) : 1;
    const segs = el => !el || el.nodeType !== 1 ? [''] : el.id && document.getElementById(el.id) === el ? [`id("${el.id}")`] : [...segs(el.parentNode), `${el.localName.toLowerCase()}[${idx(el)}]`];
    return segs(element).join('/');
}

function highlightText(annotation) {
    const range = document.createRange();
    const startNode = document.evaluate(annotation.startXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const endNode = document.evaluate(annotation.endXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    range.setStart(startNode, annotation.startOffset);
    range.setEnd(endNode, annotation.endOffset);

    const span = document.createElement("span");
    span.style.backgroundColor = annotation.color;
    span.classList.add("annotated-text");
    span.dataset.noteId = annotation.noteId;
    range.surroundContents(span);
}

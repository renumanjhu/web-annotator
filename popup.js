document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get('highlightColor', function(result) {
      const colorInput = document.getElementById('color');
      colorInput.value = data.highlightColor || '#ffff00';
        
    });

    document.getElementById('save').addEventListener('click', function() {
        const color = document.getElementById('color').value;
        chrome.storage.sync.set({ highlightColor: color }, function() {
          console.log('Highlight color saved:', color);
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateHighlightColor', color: color });
          });
        });
      });

    document.getElementById("export-pdf").addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            const tabUrl = new URL(tab.url);
            const tabOrigin = `${tabUrl.protocol}//${tabUrl.hostname}`;

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: exportNotesToPDF,
                args: [tabOrigin]
            });
        });
    });

    document.getElementById("search-filter").addEventListener("click", function () {
        let keyword = document.getElementById("search").value;
        let category = document.getElementById("filter-category").value;
        let date = document.getElementById("filter-date").value;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            const tabUrl = new URL(tab.url);
            const tabOrigin = `${tabUrl.protocol}//${tabUrl.hostname}`;

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: filterAnnotations,
                args: [tabOrigin, keyword, category, date]
            });
        });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "showNotePopup") {
            showNotePopup();
        }
    });

    document.getElementById("save-note").addEventListener("click", function () {
        const noteContent = document.getElementById("note-content").value;
        chrome.storage.sync.get(["currentNote"], function (result) {
            const annotation = result.currentNote;
            annotation.note = noteContent;
            chrome.storage.sync.set({ [annotation.noteId]: annotation }, function () {
                document.getElementById("note-popup").classList.add("hidden");
                chrome.runtime.sendMessage({ action: "updateAnnotations" });
            });
        });
    });

    document.getElementById("close-note").addEventListener("click", function () {
        document.getElementById("note-popup").classList.add("hidden");
    });
});

function showNotePopup() {
    chrome.storage.sync.get(["currentNote"], function (result) {
        const annotation = result.currentNote;
        if (annotation) {
            document.getElementById("note-content").value = annotation.note;
            document.getElementById("note-popup").classList.remove("hidden");
        }
    });
}

function filterAnnotations(tabOrigin, keyword, category, date) {
    chrome.storage.sync.get(null, function (items) {
        const annotations = Object.values(items).flat();
        const filteredAnnotations = annotations.filter(item => {
            const itemUrl = new URL(item.url);
            const itemOrigin = `${itemUrl.protocol}//${itemUrl.hostname}`;
            return itemOrigin === tabOrigin &&
                (keyword === "" || item.text.includes(keyword)) &&
                (category === "" || item.category === category) &&
                (date === "" || item.date === date);
        });

        let annotationList = document.getElementById("annotation-list");
        annotationList.innerHTML = "";
        filteredAnnotations.forEach(annotation => {
            let li = document.createElement("li");
            li.textContent = `Text: ${annotation.text}, Note: ${annotation.note}, Date: ${annotation.date}, Category: ${annotation.category}`;
            annotationList.appendChild(li);
        });
    });
}

function exportNotesToPDF(tabOrigin) {
    chrome.storage.sync.get(null, function (items) {
        const annotations = Object.values(items).flat().filter(item => {
            const itemUrl = new URL(item.url);
            const itemOrigin = `${itemUrl.protocol}//${itemUrl.hostname}`;
            return itemOrigin === tabOrigin;
        });

        if (annotations.length === 0) return;

        const pdfContent = annotations.map((annotation, index) =>
            `Annotation ${index + 1}:\nText: ${annotation.text}\nNote: ${annotation.note}\nDate: ${annotation.date}\nCategory: ${annotation.category}`
        ).join('\n\n');

        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotations.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}








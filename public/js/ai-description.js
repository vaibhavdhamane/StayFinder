document.addEventListener("DOMContentLoaded", () => {
  const descriptionField = document.getElementById("listing-description");
  const refineButton = document.getElementById("refine-description-button");
  const preview = document.getElementById("ai-description-preview");
  const suggestionField = document.getElementById("ai-description-suggestion");
  const useSuggestionButton = document.getElementById("use-ai-description");
  const closePreviewButton = document.getElementById("close-ai-preview");

  if (
    !descriptionField ||
    !refineButton ||
    !preview ||
    !suggestionField ||
    !useSuggestionButton ||
    !closePreviewButton
  ) {
    return;
  }

  let latestSuggestion = "";
  let sourceDescription = "";
  let isRefining = false;

  function hasValidDraft(value) {
    const description = value.trim();
    const wordCount = description.split(/\s+/).filter(Boolean).length;
    return wordCount >= 8 && description.length <= 3000;
  }

  function updateRefineButton() {
    refineButton.disabled = isRefining || !hasValidDraft(descriptionField.value);
  }

  updateRefineButton();

  descriptionField.addEventListener("input", () => {
    if (latestSuggestion && descriptionField.value.trim() !== sourceDescription) {
      useSuggestionButton.disabled = true;
    } else if (latestSuggestion) {
      useSuggestionButton.disabled = false;
    }
    updateRefineButton();
  });

  refineButton.addEventListener("click", async () => {
    sourceDescription = descriptionField.value.trim();
    if (!hasValidDraft(sourceDescription)) return;

    isRefining = true;
    updateRefineButton();
    refineButton.textContent = "Refining...";
    useSuggestionButton.disabled = true;
    latestSuggestion = "";
    preview.hidden = true;

    try {
      const response = await fetch("/listings/ai-refine-description", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ description: sourceDescription }),
      });

      if (response.redirected) {
        throw new Error("Please sign in again to use AI refinement.");
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not refine the description.");
      if (typeof result.refinedDescription !== "string" || !result.refinedDescription.trim()) {
        throw new Error("The AI response did not contain a refined description.");
      }

      latestSuggestion = result.refinedDescription;
      suggestionField.value = latestSuggestion;
      preview.hidden = false;
      useSuggestionButton.disabled = descriptionField.value.trim() !== sourceDescription;
      preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      preview.hidden = true;
    } finally {
      isRefining = false;
      refineButton.textContent = "Refine with AI";
      updateRefineButton();
    }
  });

  useSuggestionButton.addEventListener("click", () => {
    if (
      !latestSuggestion ||
      useSuggestionButton.disabled ||
      descriptionField.value.trim() !== sourceDescription
    ) return;

    descriptionField.value = latestSuggestion;
    descriptionField.dispatchEvent(new Event("input", { bubbles: true }));
    descriptionField.focus();
  });

  closePreviewButton.addEventListener("click", () => {
    preview.hidden = true;
    latestSuggestion = "";
  });
});

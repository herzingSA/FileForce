document.addEventListener("mouseover", (e) => {
  const btn = e.target.closest(".btn-outline-secondary[data-mime]");
  if (!btn) return;

  const mime = btn.dataset.mime ? btn.dataset.mime.toLowerCase() : "";

  const viewableTypes = new Set([
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Documents & text
    "application/pdf",
    "text/plain",
    "text/html",
    "text/css",
    "application/json",
    "application/xml",
    "text/xml",
    "application/javascript",
    "text/markdown",

    // Audio
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",

    // Video
    "video/mp4",
    "video/webm",
    "video/ogg",
  ]);

  const isViewable = viewableTypes.has(mime); // Use has instead of includes
  const tooltipText = isViewable
    ? "View"
    : "Not a viewable filetype – try download";

  btn.setAttribute("title", tooltipText);
});

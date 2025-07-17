document.addEventListener("mouseover", (e) => {
  const btn = e.target.closest(".btn-outline-secondary[data-mime]");
  if (!btn) return;

  const mime = btn.dataset.mime?.toLowerCase() || "";
  const viewableTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
  ];

  const isViewable = viewableTypes.includes(mime);
  const tooltipText = isViewable
    ? "View"
    : "Not a viewable filetype – try download";

  btn.setAttribute("title", tooltipText);
});

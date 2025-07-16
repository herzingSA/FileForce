// brr
document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("fileTableBody");
  const statusArea = document.getElementById("statusArea");

  const allFiles = await fetchAllFiles();

  // Utility: Badge renderer
  function showStatus(message, type = "info") {
    const badge = document.createElement("div");
    badge.textContent = message;
    badge.className = `alert alert-${type} mb-2`;
    statusArea.appendChild(badge);
    setTimeout(() => badge.remove(), 5000);
  }

  // Utility: Tooltip initializer
  function activateTooltips() {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
  }

  // Render table rows
  function renderTable(files) {
    tableBody.innerHTML = "";
    files.forEach((file) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${file.name}</td>
        <td>${file.type.toUpperCase()}</td>
        <td>${file.created_at}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="tooltip" title="Download"
            onclick="handleDownload(${file.id})">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary me-1" data-bs-toggle="tooltip" title="View"
            onclick="handleView(${file.id})">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-bs-toggle="tooltip" title="Delete"
            onclick="handleDelete(${file.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    activateTooltips();
  }

  // Action handlers
  window.handleDownload = async (id) => {
    const result = await downloadFile(id);
    showStatus(result.message, result.status);
  };

  window.handleView = async (id) => {
    const result = await viewFile(id);
    showStatus(result.message, result.status);
  };

  window.handleDelete = async (id) => {
    const result = await deleteFile(id);
    showStatus(result.message, result.status);
    // Refresh table
    const updatedFiles = await fetchAllFiles();
    renderTable(updatedFiles);
  };

  // Initial render
  renderTable(allFiles);
});

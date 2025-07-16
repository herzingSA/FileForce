// main.js
document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("fileTableBody");

  const allFiles = await fetchAllFiles();

  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-success");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-success");
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-success");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile({ files });
      showStatus("File uploaded successfully", "success");

      const updatedFiles = await fetchAllFiles();
      renderTable(updatedFiles);
    }
  });

  document.getElementById("uploadBtn").addEventListener("click", async () => {
    const input = document.getElementById("fileInput");
    await uploadFile({ files: input.files });
    showStatus("File uploaded successfully", "success");

    const updatedFiles = await fetchAllFiles();
    renderTable(updatedFiles);
  });

  function showStatus(message, type = "info") {
    const box = document.getElementById("statusBox");
    box.textContent = message;
    box.className = `small ms-3 text-${type}`;
  }

  function activateTooltips() {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
  }

  function renderTable(files) {
    tableBody.innerHTML = "";

    files.forEach((file) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <span class="filename-text" data-id="${
            file.id
          }" data-bs-toggle="tooltip" title="Click to Rename" style="cursor:pointer;">${
        file.name
      }/span>
        </td>
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

    // Attach rename listeners to filename spans
    document.querySelectorAll(".filename-text").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        const currentName = el.textContent;

        const input = document.createElement("input");
        input.type = "text";
        input.value = currentName;
        input.className = "form-control form-control-sm";
        input.style.maxWidth = "200px";

        el.replaceWith(input);
        input.focus();

        input.addEventListener("keydown", async (e) => {
          if (e.key === "Enter") {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
              await renameFile(id, newName);
              showStatus("File renamed successfully", "success");

              const updatedFiles = await fetchAllFiles();
              renderTable(updatedFiles);
            } else {
              input.replaceWith(el);
            }
          }
          if (e.key === "Escape") {
            input.replaceWith(el);
          }
        });
      });
    });
  }

  // Handlers
  window.handleDownload = async (id) => {
    await downloadFile(id);
    showStatus("File download started", "info");
  };

  window.handleView = async (id) => {
    await viewFile(id);
    showStatus("File viewed successfully", "info");
  };

  window.handleDelete = async (id) => {
    await deleteFile(id);
    showStatus("File deleted successfully", "success");

    const updatedFiles = await fetchAllFiles();
    renderTable(updatedFiles);
  };

  // Initial render
  renderTable(allFiles);
});

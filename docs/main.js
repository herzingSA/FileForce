document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("fileTableBody");
  const statusBox = document.getElementById("statusBox");
  const dropZone = document.getElementById("dropZone");

  // 🧩 Minimalist status feedback
  function showStatus(message, type = "info") {
    statusBox.textContent = message;
    statusBox.className = `small ms-3 text-${type}`;
  }

  // 🧠 Create filename span for reuse
  function createFilenameSpan(id, name) {
    const span = document.createElement("span");
    span.className = "filename-text";
    span.setAttribute("data-id", id);
    span.setAttribute("data-bs-toggle", "tooltip");
    span.setAttribute("title", "Click to Rename");
    span.style.cursor = "pointer";
    span.innerHTML = `<i class="bi bi-pencil-fill me-1 text-muted"></i> ${name}`;

    span.addEventListener("click", () => enableRename(span));
    return span;
  }

  // 📝 Inline rename logic
  function enableRename(spanEl) {
    const id = spanEl.getAttribute("data-id");
    const currentName = spanEl.textContent.trim();

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = "form-control form-control-sm";
    input.style.maxWidth = "200px";

    spanEl.replaceWith(input);
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
          input.replaceWith(createFilenameSpan(id, currentName));
          activateTooltips();
        }
      }
      if (e.key === "Escape") {
        input.replaceWith(createFilenameSpan(id, currentName));
        activateTooltips();
      }
    });
  }

  // 🧠 Enable tooltips
  function activateTooltips() {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
  }

  // 🧩 Render file table
  function renderTable(files) {
    tableBody.innerHTML = "";

    files.forEach((file) => {
      const row = document.createElement("tr");

      const filenameCell = document.createElement("td");
      const filenameSpan = createFilenameSpan(file.id, file.name);
      filenameCell.appendChild(filenameSpan);

      row.appendChild(filenameCell);

      row.innerHTML += `
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

  // 🖱️ Drag & Drop handling
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

  // ✅ Upload button
  document.getElementById("uploadBtn").addEventListener("click", async () => {
    const input = document.getElementById("fileInput");
    await uploadFile({ files: input.files });
    showStatus("File uploaded successfully", "success");

    const updatedFiles = await fetchAllFiles();
    renderTable(updatedFiles);
  });

  // 📥 Action handlers
  window.handleDownload = async (id) => {
    await downloadFile(id);
    showStatus("File download started", "info");
  };

  window.handleView = async (id) => {
    await viewFile(id);
    showStatus("File viewed successfully", "info");
  };

  // 🗑️ Delete confirmation modal
  let pendingDeleteId = null;

  window.handleDelete = async (id) => {
    pendingDeleteId = id;
    const modal = new bootstrap.Modal(
      document.getElementById("confirmDeleteModal")
    );
    modal.show();
  };

  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async () => {
      if (pendingDeleteId !== null) {
        await deleteFile(pendingDeleteId);
        showStatus("File deleted successfully", "success");

        const updatedFiles = await fetchAllFiles();
        renderTable(updatedFiles);
        pendingDeleteId = null;
      }

      const modalEl = document.getElementById("confirmDeleteModal");
      bootstrap.Modal.getInstance(modalEl)?.hide();
    });

  // 🌐 Initial load
  const allFiles = await fetchAllFiles();
  renderTable(allFiles);
});

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("fileTableBody");
  const statusBox = document.getElementById("statusBox");
  const dropZone = document.getElementById("dropZone");

  let pendingDeleteId = null;
  let pendingRenameId = null;
  let pendingRenameType = null;

  // 💬 Inline status
  function showStatus(message, type = "info") {
    statusBox.textContent = message;
    statusBox.className = `small ms-3 text-${type}`;
  }

  // 🎯 Enable tooltips
  function activateTooltips() {
    const triggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    triggers.forEach((el) => new bootstrap.Tooltip(el));
  }

  // 🧠 MIME-aware viewable types
  function isViewableType(type) {
    const viewableTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/plain",
      "text/html",
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "video/webm",
    ];
    return viewableTypes.includes(type.toLowerCase());
  }

  // 🧩 Render file table
  function renderTable(files) {
    tableBody.innerHTML = "";

    files.forEach((file) => {
      const row = document.createElement("tr");

      const filenameCell = document.createElement("td");
      filenameCell.innerHTML = `
        <span
          style="cursor:pointer;"
          class="filename-text"
          data-bs-toggle="tooltip"
          title="Click to Rename"
          onclick="handleRename(${file.id}, '${file.name}', '${file.type}')"
        >
          <i class="bi bi-pencil-fill me-1 text-muted"></i> ${file.name}
        </span>
      `;

      const typeCell = document.createElement("td");
      typeCell.textContent = file.type.toUpperCase();

      const dateCell = document.createElement("td");
      dateCell.textContent = file.created_at;

      const actionsCell = document.createElement("td");
      const viewButton = isViewableType(file.type)
        ? `<button class="btn btn-sm btn-outline-secondary me-1" data-bs-toggle="tooltip" title="View"
            onclick="handleView(${file.id})">
            <i class="bi bi-eye"></i>
          </button>`
        : "";

      actionsCell.innerHTML = `
        <button class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="tooltip" title="Download"
          onclick="handleDownload(${file.id})">
          <i class="bi bi-download"></i>
        </button>
        ${viewButton}
        <button class="btn btn-sm btn-outline-danger" data-bs-toggle="tooltip" title="Delete"
          onclick="handleDelete(${file.id})">
          <i class="bi bi-trash"></i>
        </button>
      `;

      row.appendChild(filenameCell);
      row.appendChild(typeCell);
      row.appendChild(dateCell);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });

    activateTooltips();
  }

  // ✏️ Rename modal logic
  window.handleRename = (id, currentName, type) => {
    pendingRenameId = id;
    pendingRenameType = type;
    document.getElementById("renameInput").value = currentName;

    const modal = new bootstrap.Modal(document.getElementById("renameModal"));
    modal.show();
  };

  document
    .getElementById("renameConfirmBtn")
    .addEventListener("click", async () => {
      const input = document.getElementById("renameInput");
      const newName = input.value.trim();

      if (newName && pendingRenameId !== null) {
        await renameFile(pendingRenameId, newName, pendingRenameType);
        showStatus("File renamed successfully", "success");

        const updatedFiles = await fetchAllFiles();
        renderTable(updatedFiles);
      }

      bootstrap.Modal.getInstance(
        document.getElementById("renameModal")
      )?.hide();
      pendingRenameId = null;
    });

  // 📥 File actions
  window.handleDownload = async (id) => {
    await downloadFile(id);
    showStatus("File download started", "info");
  };

  window.handleView = async (id) => {
    await viewFile(id);
    showStatus("File viewed successfully", "info");
  };

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

      bootstrap.Modal.getInstance(
        document.getElementById("confirmDeleteModal")
      )?.hide();
    });

  // 🖱️ Drag & Drop behavior
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

  // 🟢 Manual upload button
  document.getElementById("uploadBtn").addEventListener("click", async () => {
    const input = document.getElementById("fileInput");
    await uploadFile({ files: input.files });
    showStatus("File uploaded successfully", "success");

    const updatedFiles = await fetchAllFiles();
    renderTable(updatedFiles);
  });

  // 🚀 Initial render
  const allFiles = await fetchAllFiles();
  renderTable(allFiles);
});

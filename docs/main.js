document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("fileTableBody");
  const statusBox = document.getElementById("statusBox");
  const dropZone = document.getElementById("dropZone");

  let pendingDeleteId = null;
  let pendingRenameId = null;
  let pendingRenameType = null;

  let sortField = null;
  let sortDirection = "asc"; // "asc" or "desc"

  function showStatus(message, type = "info") {
    statusBox.textContent = message;
    statusBox.className = `small ms-3 text-${type}`;
  }

  function activateTooltips() {
    const triggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    triggers.forEach((el) => new bootstrap.Tooltip(el));
  }

  function sortFiles(files) {
    if (!sortField) return files;

    return [...files].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "name" || sortField === "type") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "created_at") {
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }

      return 0;
    });
  }

  function updateSortArrows() {
    document.querySelectorAll(".sort-arrow").forEach((arrow) => {
      arrow.textContent = "";
    });

    const idMap = {
      name: "sort-filename",
      type: "sort-type",
      created_at: "sort-date",
    };

    const targetId = idMap[sortField];
    if (targetId) {
      const arrowSpan = document.querySelector(`#${targetId} .sort-arrow`);
      if (arrowSpan) {
        arrowSpan.textContent = sortDirection === "asc" ? "▲" : "▼";
      }
    }
  }

  function renderTable(files) {
    tableBody.innerHTML = "";

    const sorted = sortFiles(files);

    sorted.forEach((file) => {
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
      actionsCell.innerHTML = `
        <button class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="tooltip" title="Download"
          onclick="handleDownload(${file.id})">
          <i class="bi bi-download"></i>
        </button>

        <button class="btn btn-sm btn-outline-secondary me-1" data-bs-toggle="tooltip" title="View" data-mime="${file.type}"
          onclick="handleView(${file.id})">
          <i class="bi bi-eye"></i>
        </button>

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
    updateSortArrows();
  }

  function toggleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = "asc";
    }

    fetchAllFiles().then(renderTable);
  }

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

      const modalEl = document.getElementById("confirmDeleteModal");
      bootstrap.Modal.getInstance(modalEl)?.hide();
    });

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

  // 🔃 Sorting header event bindings
  document
    .getElementById("sort-filename")
    .addEventListener("click", () => toggleSort("name"));
  document
    .getElementById("sort-type")
    .addEventListener("click", () => toggleSort("type"));
  document
    .getElementById("sort-date")
    .addEventListener("click", () => toggleSort("created_at"));

  const allFiles = await fetchAllFiles();
  renderTable(allFiles);
});

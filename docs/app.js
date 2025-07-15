const API_URL = "https://quanttrain.com/herzing/Hapi.php";
let files = [];
let sortKey = "name";
let sortOrder = "asc";

async function apiRequest(action, method, body = null, query = "") {
  try {
    const options = { method };
    if (body instanceof FormData) {
      options.body = body;
    } else if (body) {
      options.headers = {
        "Content-Type":
          method === "POST" && action !== "delete"
            ? "application/json"
            : "application/x-www-form-urlencoded",
      };
      options.body = body;
    }
    const url = query
      ? `${API_URL}?action=${action}&${query}`
      : `${API_URL}?action=${action}`;
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    }
    return { response, contentType };
  } catch (error) {
    logOutput(`Error in ${action}: ${error.message}`);
    throw error;
  }
}

function logOutput(message) {
  const output = document.getElementById("output");
  output.innerHTML += `<p>${message}</p>`;
}

function updateTable() {
  const table = document.getElementById("fileTable");
  table.innerHTML = "";
  let filteredFiles = files;
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  if (searchTerm) {
    filteredFiles = files.filter(
      (file) =>
        file.name.toLowerCase().includes(searchTerm) ||
        file.type.toLowerCase().includes(searchTerm)
    );
  }
  filteredFiles.sort((a, b) => {
    let aValue = a[sortKey];
    let bValue = b[sortKey];
    if (sortKey === "created_at") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    if (sortOrder === "desc") [aValue, bValue] = [bValue, aValue];
    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
  });
  filteredFiles.forEach((file) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${file.name}</td>
            <td>${file.type}</td>
            <td>${new Date(file.created_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="testDownload(false, ${
                  file.id
                })">View</button>
                <button class="btn btn-sm btn-success" onclick="testDownload(true, ${
                  file.id
                })">Download</button>
                <button class="btn btn-sm btn-warning" onclick="testUpdate(${
                  file.id
                })">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="testDelete(${
                  file.id
                })">Delete</button>
            </td>
        `;
    table.appendChild(row);
  });
  document
    .querySelectorAll("th")
    .forEach((th) => th.classList.remove("sorted", "asc", "desc"));
  const sortTh = document.querySelector(`th[data-sort="${sortKey}"]`);
  if (sortTh) {
    sortTh.classList.add("sorted", sortOrder);
  }
}

function sortTable(key) {
  if (sortKey === key) {
    sortOrder = sortOrder === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortOrder = "asc";
  }
  updateTable();
}

async function testUpload() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) {
    logOutput("Upload: Please select a file");
    return;
  }
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  const result = await apiRequest("upload", "POST", formData);
  if (result.success) await testRead();
  logOutput(`Upload: ${JSON.stringify(result)}`);
}

async function testCreate() {
  const data = {
    name: "sample.jpg",
    type: "jpg",
    file_path: "files/sample.jpg",
  };
  const result = await apiRequest("create", "POST", JSON.stringify(data));
  if (result.success) await testRead();
  logOutput(`Create: ${JSON.stringify(result)}`);
}

async function testRead() {
  const result = await apiRequest("read", "GET");
  if (result.data) {
    files = result.data;
    updateTable();
  }
  logOutput(`Read: ${JSON.stringify(result)}`);
}

async function testUpdate(id) {
  const newName = prompt("Enter new name (keep extension):", "new-test.pdf");
  if (newName) {
    const data = { name: newName };
    const result = await apiRequest(
      "update",
      "POST",
      JSON.stringify(data),
      `id=${id}`
    );
    if (result.success) await testRead();
    logOutput(`Update: ${JSON.stringify(result)}`);
  }
}

async function testDelete(id) {
  if (confirm("Delete file?")) {
    const formData = new URLSearchParams({ id });
    const result = await apiRequest("delete", "POST", formData.toString());
    if (result.success) await testRead();
    logOutput(`Delete: ${JSON.stringify(result)}`);
  }
}

async function testDownload(asAttachment, id) {
  try {
    const query = `id=${id}&as_attachment=${asAttachment}`;
    const { response, contentType } = await apiRequest(
      "download",
      "GET",
      null,
      query
    );
    if (contentType.includes("application/json")) {
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      logOutput(`Download/View: ${JSON.stringify(result)}`);
    } else {
      if (asAttachment) {
        const blob = await response.blob();
        const contentDisposition =
          response.headers.get("Content-Disposition") || "";
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "file";
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        window.open(`${API_URL}?action=download&${query}`, "_blank");
      }
      logOutput(`Download/View (as_attachment=${asAttachment}): Success`);
    }
  } catch (error) {
    logOutput(
      `Download/View (as_attachment=${asAttachment}): ${error.message}`
    );
  }
}

document.getElementById("searchInput").addEventListener("input", updateTable);
testRead(); // Initial load

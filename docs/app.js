// brr app.js
const API_URL = "https://quanttrain.com/herzing/Hapi.php";

// Generic API request handler
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

    return {
      response,
      contentType: response.headers.get("Content-Type") || "",
    };
  } catch (error) {
    console.error(`API error in '${action}':`, error.message);
    throw error;
  }
}

// File actions with dynamic ID support
async function fetchFileMeta(id) {
  const { response } = await apiRequest("read", "GET");
  const data = await response.json();
  return Array.isArray(data.data)
    ? data.data.find((item) => item.id == id)
    : null;
}

async function downloadFile(fileId) {
  try {
    const file = await fetchFileMeta(fileId);
    if (!file || !file.name) throw new Error("Filename not found");

    const query = `id=${fileId}&as_attachment=true`;
    const { response, contentType } = await apiRequest(
      "download",
      "GET",
      null,
      query
    );

    if (contentType.includes("application/json")) {
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return { status: "info", message: result };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    window.URL.revokeObjectURL(url);

    return { status: "success", message: `Downloaded file: ${file.name}` };
  } catch (error) {
    return { status: "error", message: `Download failed: ${error.message}` };
  }
}

async function viewFile(fileId) {
  try {
    const query = `id=${fileId}&as_attachment=false`;
    const url = `${API_URL}?action=download&${query}`;
    window.open(url, "_blank");
    return { status: "success", message: `View opened: ${url}` };
  } catch (error) {
    return { status: "error", message: `View failed: ${error.message}` };
  }
}

async function deleteFile(fileId) {
  try {
    const body = new URLSearchParams({ id: fileId.toString() }).toString();
    const { response } = await apiRequest("delete", "POST", body);
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    return { status: "success", message: `Deleted file ID: ${fileId}` };
  } catch (error) {
    return { status: "error", message: `Delete failed: ${error.message}` };
  }
}

async function uploadFile(fileInput) {
  const file = fileInput?.files?.[0];
  if (!file) return { status: "warning", message: "No file selected" };

  const formData = new FormData();
  formData.append("file", file);

  try {
    const { response } = await apiRequest("upload", "POST", formData);
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    return { status: "success", message: `Upload successful: ${file.name}` };
  } catch (error) {
    return { status: "error", message: `Upload failed: ${error.message}` };
  }
}

// async function renameFile(fileId, newName) {
//   try {
//     const body = JSON.stringify({ id: fileId, name: newName });
//     const { response } = await apiRequest("rename", "POST", body);
//     const result = await response.json();
//     if (result.error) throw new Error(result.error);
//     return { status: "success", message: "file renamed ok" };
//   } catch (error) {
//     console.error("Rename failed:", error.message);
//     return { status: "error", message: "rename failed" };
//   }
// }

async function renameFile(fileId, newName) {
  try {
    const body = JSON.stringify({ name: newName, type: "txt" }); // Use actual type if known
    const query = `id=${fileId}`;

    const { response } = await apiRequest("update", "POST", body, query);
    const result = await response.json();

    if (result.error) throw new Error(result.error);
    return { status: "success", message: "file renamed ok" };
  } catch (error) {
    console.error("Rename failed:", error.message);
    return { status: "error", message: "rename failed" };
  }
}

async function fetchAllFiles() {
  try {
    const { response } = await apiRequest("read", "GET");
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error("Fetch files failed:", error.message);
    return [];
  }
}

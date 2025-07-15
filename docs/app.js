const API_URL = "https://quanttrain.com/herzing/Hapi.php";

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
    logOutput(`Error in ${action}: ${error.message}`, "error");
    throw error;
  }
}

function logOutput(message, type = "info") {
  const output = document.getElementById("output");
  const p = document.createElement("p");
  p.textContent = message;
  p.className = type;
  output.appendChild(p);
}

async function testUpload() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) {
    logOutput("Upload: Please select a file", "warning");
    return;
  }
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  try {
    const { response } = await apiRequest("upload", "POST", formData);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    logOutput(`Upload successful: ${JSON.stringify(result)}`, "success");
  } catch (error) {
    logOutput(`Upload failed: ${error.message}`, "error");
  }
}

async function testCreate() {
  const data = {
    name: "sample.jpg",
    type: "jpg",
    file_path: "files/sample.jpg",
  };
  try {
    const { response } = await apiRequest(
      "create",
      "POST",
      JSON.stringify(data)
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    logOutput(`Created record: ${JSON.stringify(result)}`, "success");
  } catch (error) {
    logOutput(`Create failed: ${error.message}`, "error");
  }
}

async function testRead() {
  try {
    const { response } = await apiRequest("read", "GET");
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    logOutput(`Fetched records: ${JSON.stringify(result)}`, "info");
  } catch (error) {
    logOutput(`Read failed: ${error.message}`, "error");
  }
}

async function testUpdate() {
  const data = { name: "new-test.pdf", type: "pdf" };
  try {
    const { response } = await apiRequest(
      "update",
      "POST",
      JSON.stringify(data),
      "id=1"
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    logOutput(`Update success: ${JSON.stringify(result)}`, "success");
  } catch (error) {
    logOutput(`Update failed: ${error.message}`, "error");
  }
}

async function testDelete() {
  try {
    const formData = new URLSearchParams({ id: "1" });
    const { response } = await apiRequest(
      "delete",
      "POST",
      formData.toString()
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    logOutput(`Delete success: ${JSON.stringify(result)}`, "success");
  } catch (error) {
    logOutput(`Delete failed: ${error.message}`, "error");
  }
}

async function testDownload(asAttachment) {
  try {
    const query = `id=1&as_attachment=${asAttachment}`;
    const { response, contentType } = await apiRequest(
      "download",
      "GET",
      null,
      query
    );

    if (contentType.includes("application/json")) {
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      logOutput(`Download info: ${JSON.stringify(result)}`, "info");
      return;
    }

    if (!asAttachment) {
      const viewUrl = `${API_URL}?action=download&${query}`;
      window.open(viewUrl, "_blank");
      logOutput(`View opened: ${viewUrl}`, "success");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : "download.bin";

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    logOutput(`Downloaded file: ${filename}`, "success");
  } catch (error) {
    logOutput(`Download/View failed: ${error.message}`, "error");
  }
}

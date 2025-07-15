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
    if (response.headers.get("Content-Type")?.includes("application/json")) {
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    }
    return response;
  } catch (error) {
    logOutput(`Error in ${action}: ${error.message}`);
    throw error;
  }
}

function logOutput(message) {
  const output = document.getElementById("output");
  output.innerHTML += `<p>${message}</p>`;
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
  logOutput(`Upload: ${JSON.stringify(result)}`);
}

async function testCreate() {
  const data = {
    name: "sample.jpg",
    type: "jpg",
    file_path: "files/sample.jpg",
  };
  const result = await apiRequest("create", "POST", JSON.stringify(data));
  logOutput(`Create: ${JSON.stringify(result)}`);
}

async function testRead() {
  const result = await apiRequest("read", "GET");
  logOutput(`Read: ${JSON.stringify(result)}`);
}

async function testUpdate() {
  const data = { name: "new-test.pdf", type: "pdf" };
  const result = await apiRequest(
    "update",
    "POST",
    JSON.stringify(data),
    "id=1"
  );
  logOutput(`Update: ${JSON.stringify(result)}`);
}

async function testDelete() {
  const formData = new URLSearchParams({ id: "1" });
  const result = await apiRequest("delete", "POST", formData.toString());
  logOutput(`Delete: ${JSON.stringify(result)}`);
}

async function testDownload(asAttachment) {
  try {
    const response = await apiRequest(
      "download",
      "GET",
      null,
      `id=1&as_attachment=${asAttachment}`
    );
    if (response.headers.get("Content-Type")?.includes("octet-stream")) {
      const blob = await response.blob();
      const contentDisposition =
        response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : asAttachment
        ? "test.pdf"
        : "view.pdf";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      logOutput(`Download/View (as_attachment=${asAttachment}): Success`);
    } else {
      const result = await response.json();
      logOutput(`Download/View: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    logOutput(
      `Download/View (as_attachment=${asAttachment}): ${error.message}`
    );
  }
}

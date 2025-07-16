<?php
// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: https://herzingsa.github.io");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Content-Type: application/json");
    exit;
}

// Set CORS headers
header("Access-Control-Allow-Origin: https://herzingsa.github.io");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

// Debug log
$debug_log = 'debug.log';
function debug($message) {
    global $debug_log;
    file_put_contents($debug_log, date('Y-m-d H:i:s') . ": $message\n", FILE_APPEND);
}

// Database credentials
$servername = "localhost";
//$username = "hidden";           
//$password = "hidden";              
$username = "quanttra_Herz1User";           
$password = "0x1350059@"; 
$dbname = "quanttra_Herz1";

// Connect to database
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    header("Content-Type: application/json");
    debug("Connection failed: " . $conn->connect_error);
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit;
}

// Get action
$action = $_GET['action'] ?? '';
debug("Action: $action, GET: " . json_encode($_GET) . ", Headers: " . json_encode(getallheaders()));

// Initialize response
$response = [
    "status" => "connected",
    "timestamp" => time()
];

switch ($action) {
    case 'read':
        header("Content-Type: application/json");
        $sql = "SELECT id, name, type, created_at, file_path FROM files";
        $result = $conn->query($sql);
        if ($result) {
            $rows = $result->fetch_all(MYSQLI_ASSOC);
            $response['data'] = $rows;
            debug("Read: " . json_encode($rows));
        } else {
            $response['error'] = "Error fetching data: " . $conn->error;
            debug("Read error: " . $conn->error);
        }
        break;

    case 'create':
        header("Content-Type: application/json");
        $content_type = getallheaders()['Content-Type'] ?? '';
        debug("Create: Content-Type: $content_type");
        if (strpos($content_type, 'application/json') === false) {
            $response['error'] = "Invalid Content-Type: $content_type";
            debug("Create error: Invalid Content-Type: $content_type");
            break;
        }
        $raw_input = file_get_contents("php://input");
        $input = json_decode($raw_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $response['error'] = "JSON decode error: " . json_last_error_msg();
            debug("Create error: JSON decode failed: " . json_last_error_msg());
            break;
        }
        $name = $conn->real_escape_string($input['name'] ?? '');
        $type = $conn->real_escape_string($input['type'] ?? '');
        $file_path = $conn->real_escape_string($input['file_path'] ?? '');
        if ($name && $type && $file_path) {
            $sql = "INSERT INTO files (name, type, file_path) VALUES ('$name', '$type', '$file_path')";
            if ($conn->query($sql) === TRUE) {
                $response['success'] = true;
                $response['id'] = $conn->insert_id;
                debug("Create: id=$response[id], name=$name, type=$type, file_path=$file_path");
            } else {
                $response['error'] = "Error inserting data: " . $conn->error;
                debug("Create error: " . $conn->error);
            }
        } else {
            $response['error'] = "Missing 'name', 'type', or 'file_path' field";
            debug("Create error: Missing fields, input=" . json_encode($input));
        }
        break;

    case 'update':
        header("Content-Type: application/json");
        $content_type = getallheaders()['Content-Type'] ?? '';
        debug("Update: Content-Type: $content_type");
        if (strpos($content_type, 'application/json') === false) {
            $response['error'] = "Invalid Content-Type: $content_type";
            debug("Update error: Invalid Content-Type: $content_type");
            break;
        }
        $id = $_GET['id'] ?? '';
        $raw_input = file_get_contents("php://input");
        $input = json_decode($raw_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $response['error'] = "JSON decode error: " . json_last_error_msg();
            debug("Update error: JSON decode failed: " . json_last_error_msg());
            break;
        }
        $name = $conn->real_escape_string($input['name'] ?? '');
        if (!$id || !$name) {
            $response['error'] = "Missing 'id' or 'name' field";
            debug("Update error: Missing fields, id=$id, input=" . json_encode($input));
            break;
        }
        $result = $conn->query("SELECT type FROM files WHERE id=$id");
        if ($result && $row = $result->fetch_assoc()) {
            $type = $row['type'];
            $ext = pathinfo($name, PATHINFO_EXTENSION);
            if (strtolower($ext) !== strtolower($type)) {
                $response['error'] = "New name must retain the original file extension";
                debug("Update error: Extension mismatch, name=$name, type=$type");
                break;
            }
            if (strlen($name) > 255) {
                $response['error'] = "New name is too long";
                debug("Update error: Name too long, name=$name");
                break;
            }
            $sql = "UPDATE files SET name='$name' WHERE id=$id";
            if ($conn->query($sql) === TRUE) {
                $response['success'] = true;
                $response['message'] = "File name updated";
                $response['name'] = $name;
                debug("Update: id=$id, name=$name");
            } else {
                $response['error'] = "Error updating data: " . $conn->error;
                debug("Update error: " . $conn->error);
            }
        } else {
            $response['error'] = "File not found";
            debug("Update error: File not found, id=$id");
        }
        break;

    case 'delete':
        header("Content-Type: application/json");
        $id = $_POST['id'] ?? $_GET['id'] ?? '';
        if ($id) {
            $result = $conn->query("SELECT file_path FROM files WHERE id=$id");
            if ($result && $row = $result->fetch_assoc()) {
                $file_path = $row['file_path'];
                debug("Delete: id=$id, file_path=$file_path");
                if (file_exists($file_path)) {
                    if (unlink($file_path)) {
                        debug("Delete: File unlinked: $file_path");
                    } else {
                        debug("Delete: Failed to unlink file: $file_path");
                    }
                }
            } else {
                $response['error'] = "File record not found";
                debug("Delete error: Record not found, id=$id");
                break;
            }
            $sql = "DELETE FROM files WHERE id=$id";
            if ($conn->query($sql) === TRUE) {
                $response['success'] = true;
                $response['message'] = "File deleted";
                debug("Delete: Record deleted, id=$id");
            } else {
                $response['error'] = "Error deleting data: " . $conn->error;
                debug("Delete error: " . $conn->error);
            }
        } else {
            $response['error'] = "Missing 'id' parameter";
            debug("Delete error: Missing id");
        }
        break;

    case 'upload':
        header("Content-Type: application/json");
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = 'files/';
            $name = $conn->real_escape_string($_FILES['file']['name']);
            $tmp_name = $_FILES['file']['tmp_name'];
            $type = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $filename = time() . '_' . $name;
            $file_path = $upload_dir . $filename;
            if (move_uploaded_file($tmp_name, $file_path)) {
                $sql = "INSERT INTO files (name, type, file_path) VALUES ('$name', '$type', '$file_path')";
                if ($conn->query($sql) === TRUE) {
                    $response['success'] = true;
                    $response['filename'] = $name;
                    $response['id'] = $conn->insert_id;
                    debug("Upload: id=$response[id], name=$name, type=$type, file_path=$file_path");
                } else {
                    unlink($file_path);
                    $response['error'] = "Error saving file metadata: " . $conn->error;
                    debug("Upload error: " . $conn->error);
                }
            } else {
                $response['error'] = "Error moving uploaded file";
                debug("Upload error: Failed to move file to $file_path");
            }
        } else {
            $response['error'] = "No file uploaded or upload error";
            debug("Upload error: " . json_encode($_FILES));
        }
        break;

    case 'download':
        $id = $_GET['id'] ?? '';
        $as_attachment = isset($_GET['as_attachment']) && $_GET['as_attachment'] === 'true';
        debug("Download: id=$id, as_attachment=$as_attachment");
        if ($id) {
            $result = $conn->query("SELECT file_path, name FROM files WHERE id=$id");
            if ($result && $row = $result->fetch_assoc()) {
                $file_path = $row['file_path'];
                $name = $row['name'];
                debug("Download: file_path=$file_path, name=$name");
                if (file_exists($file_path)) {
                    header("Content-Type: application/octet-stream");
                    header("Content-Disposition: " . ($as_attachment ? "attachment" : "inline") . "; filename=\"$name\"");
                    header("Content-Length: " . filesize($file_path));
                    readfile($file_path);
                    debug("Download: Served file: $file_path");
                    exit;
                } else {
                    header("Content-Type: application/json");
                    $response['error'] = "File not found at path: $file_path";
                    debug("Download error: File not found at $file_path");
                }
            } else {
                header("Content-Type: application/json");
                $response['error'] = "File record not found for id: $id";
                debug("Download error: Record not found for id=$id");
            }
        } else {
            header("Content-Type: application/json");
            $response['error'] = "Missing 'id' parameter";
            debug("Download error: Missing id");
        }
        break;

    default:
        header("Content-Type: application/json");
        $response['error'] = "Invalid action";
        debug("Error: Invalid action: $action");
        break;
}

// Send response
echo json_encode($response);
$conn->close();
?>
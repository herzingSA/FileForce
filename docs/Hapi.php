<?php
// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: https://herzingsa.github.io");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Content-Type: application/json");
    exit;
}

// Set CORS headers for regular requests
header("Access-Control-Allow-Origin: https://herzingsa.github.io");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

// Debug log file
$debug_log = 'debug.log';
function debug($message) {
    global $debug_log;
    file_put_contents($debug_log, date('Y-m-d H:i:s') . ": $message\n", FILE_APPEND);
}

// Database credentials
$servername = "localhost";         
$username = "REPLACE WITH YOUR DB USERNAME";           
$password = "REPLACE WITH YOUR DB PASSWORD"; 
$dbname   = "REPLACE WITH YOUR DB NAME";

// Create a connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    header("Content-Type: application/json");
    debug("Connection failed: " . $conn->connect_error);
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit;
}

// Get action from query parameters
$action = $_GET['action'] ?? '';
debug("Action: $action, GET: " . json_encode($_GET) . ", Headers: " . json_encode(getallheaders()));

// Initialize response array
$response = [
    "status" => "connected",
    "timestamp" => time()
];

// Handle different actions
switch ($action) {
    case 'read':
        header("Content-Type: application/json");
        $result = $conn->query("SELECT id, name, type, created_at, file_path FROM files");
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
            $response['error'] = "Invalid Content-Type: $content_type, expected application/json";
            debug("Create error: Invalid Content-Type: $content_type");
            break;
        }
        $raw_input = file_get_contents("php://input");
        debug("Create: Raw input: " . $raw_input);
        $input = json_decode($raw_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Fallback: Try $_POST
            $input = $_POST;
            debug("Create: Fallback to POST: " . json_encode($input));
            if (empty($input) && isset($_GET['name'], $_GET['type'], $_GET['file_path'])) {
                $input = [
                    'name' => $_GET['name'],
                    'type' => $_GET['type'],
                    'file_path' => $_GET['file_path']
                ];
                debug("Create: Fallback to GET: " . json_encode($input));
            }
            if (json_last_error() !== JSON_ERROR_NONE || empty($input)) {
                $response['error'] = "JSON decode error: " . json_last_error_msg() . ", Raw input: $raw_input";
                debug("Create error: JSON decode failed: " . json_last_error_msg());
                break;
            }
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
            $response['error'] = "Invalid Content-Type: $content_type, expected application/json";
            debug("Update error: Invalid Content-Type: $content_type");
            break;
        }
        $id = $_GET['id'] ?? '';
        $raw_input = file_get_contents("php://input");
        debug("Update: Raw input: " . $raw_input);
        $input = json_decode($raw_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $response['error'] = "JSON decode error: " . json_last_error_msg();
            debug("Update error: JSON decode failed: " . json_last_error_msg());
            break;
        }
        $name = $conn->real_escape_string($input['name'] ?? '');
        $type = $conn->real_escape_string($input['type'] ?? '');
        if ($id && $name && $type) {
            $sql = "UPDATE files SET name='$name', type='$type' WHERE id=$id";
            if ($conn->query($sql) === TRUE) {
                $response['success'] = true;
                debug("Update: id=$id, name=$name, type=$type");
            } else {
                $response['error'] = "Error updating data: " . $conn->error;
                debug("Update error: " . $conn->error);
            }
        } else {
            $response['error'] = "Missing 'id', 'name', or 'type' field";
            debug("Update error: Missing fields, id=$id, input=" . json_encode($input));
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
                } else {
                    debug("Delete: File not found: $file_path");
                }
            } else {
                $response['error'] = "File record not found: " . $conn->error;
                debug("Delete error: Record not found, id=$id");
                break;
            }
            $sql = "DELETE FROM files WHERE id=$id";
            if ($conn->query($sql) === TRUE) {
                $response['success'] = true;
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
            $type = pathinfo($name, PATHINFO_EXTENSION);
            $file_path = $upload_dir . time() . '_' . $name;
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
                        // 🔐 Add CORS headers for cross-origin access
                        header("Access-Control-Allow-Origin: https://herzingsa.github.io");
                        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
                        header("Access-Control-Allow-Headers: Content-Type");
        
                        // 🧠 Detect and use correct MIME type for better browser behavior
                        $finfo = finfo_open(FILEINFO_MIME_TYPE);
                        $mime_type = finfo_file($finfo, $file_path);
                        finfo_close($finfo);
                        header("Content-Type: $mime_type");
        
                        // 📄 Control inline vs attachment behavior
                        $disposition = $as_attachment ? "attachment" : "inline";
                        header("Content-Disposition: $disposition; filename=\"$name\"");
                        header("Content-Length: " . filesize($file_path));
        
                        // 🚀 Serve the file
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

// Send the response
echo json_encode($response);

// Close the connection
$conn->close();
?>
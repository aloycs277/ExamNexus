<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
 
error_reporting(E_ALL);
ini_set('display_errors', 1);
 
// Standard DB connection credentials
$conn = new mysqli("localhost", "root", "", "examshield_db");
 
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit;
}
 
// SAFE AND STABLE EXTRACTOR: Grabs both GET and POST requests out-of-the-box perfectly
$input = $_REQUEST;

// Fallback parsing for raw JSON streams
$jsonStream = file_get_contents("php://input");
if (!empty($jsonStream)) {
    $decodedJson = json_decode($jsonStream, true);
    if (is_array($decodedJson)) {
        $input = array_merge($input, $decodedJson);
    }
}

$action = isset($input['action']) ? $input['action'] : '';
 
// --- DATA SELECTION ACTIONS ---
if ($action === 'getUsers') {
    $res = $conn->query("SELECT * FROM users");
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}
if ($action === 'getHalls') {
    $res = $conn->query("SELECT * FROM halls");
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}
if ($action === 'getDuties') {
    $res = $conn->query("SELECT * FROM duties");
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}
 
// --- RESTORED SECURE DELETIONS ---
if ($action === 'deleteUser') {
    $id = isset($input['id']) ? trim($input['id']) : '';
    if ($id === '') {
        echo json_encode(["status" => "error", "message" => "Missing user id parameter"]);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("s", $id);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
    $stmt->close();
    exit;
}
 
if ($action === 'deleteHall') {
    $room = isset($input['room']) ? trim($input['room']) : '';
    if ($room === '') {
        echo json_encode(["status" => "error", "message" => "Missing room parameter"]);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM halls WHERE room = ?");
    $stmt->bind_param("s", $room);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
    $stmt->close();
    exit;
}
 
if ($action === 'deleteDuty') {
    $id = isset($input['id']) ? trim($input['id']) : '';
    if ($id === '') {
        echo json_encode(["status" => "error", "message" => "Missing duty id parameter"]);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM duties WHERE id = ?");
    $stmt->bind_param("s", $id);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
    $stmt->close();
    exit;
}
 
// --- LOOK FOR YOUR EXISTING WIPE CONDITIONAL BLOCK AND UPDATE TO THIS: ---

if ($action === 'wipeStudents') {
    $conn->query("DELETE FROM users WHERE role = 'student'");
    echo json_encode(["status" => "success"]);
    exit;
}

if ($action === 'wipeTeachers') {
    // New condition targeting teacher credentials exclusively
    $conn->query("DELETE FROM users WHERE role = 'teacher'");
    echo json_encode(["status" => "success"]);
    exit;
}

if ($action === 'wipeHalls') {
    // Wipes all layout configuration rows entirely
    $conn->query("DELETE FROM halls");
    echo json_encode(["status" => "success"]);
    exit;
}

if ($action === 'wipeDuties') {
    // Wipes out all invigilation assignments row profiles completely
    $conn->query("DELETE FROM duties");
    echo json_encode(["status" => "success"]);
    exit;
}
 
if ($action === 'updateHall') {
    $room = isset($input['room']) ? $conn->real_escape_string($input['room']) : '';
    $capacity = isset($input['capacity']) ? $conn->real_escape_string($input['capacity']) : '';
    $conn->query("UPDATE halls SET capacity = '$capacity' WHERE room = '$room'");
    echo json_encode(["status" => "success"]);
    exit;
}
 
// --- ADD / UPDATE ACTIONS ---
if ($action === 'saveBulkUsers') {
    if (isset($input['students']) && is_array($input['students'])) {
        $stmt = $conn->prepare("INSERT INTO users (id, name, role, dept) VALUES (?, ?, 'student', ?) ON DUPLICATE KEY UPDATE name=?, dept=?");
        foreach ($input['students'] as $student) {
            $stmt->bind_param("sssss", $student['id'], $student['name'], $student['dept'], $student['name'], $student['dept']);
            $stmt->execute();
        }
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "No records provided."]);
    }
    exit;
}
 
if ($action === 'saveUser') {
    $stmt = $conn->prepare("INSERT INTO users (id, name, role, dept) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, role=?, dept=?");
    $stmt->bind_param(
        "sssssss",
        $input['id'],
        $input['name'],
        $input['role'],
        $input['dept'],
        $input['name'],
        $input['role'],
        $input['dept']
    );
    $stmt->execute();
    echo json_encode(["status" => "success"]);
    exit;
}
 
if ($action === 'saveHall') {
    $stmt = $conn->prepare("INSERT INTO halls (room, capacity) VALUES (?, ?) ON DUPLICATE KEY UPDATE capacity=?");
    $stmt->bind_param("sii", $input['room'], $input['capacity'], $input['capacity']);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
    exit;
}
 
if ($action === 'saveDuty') {
    $stmt = $conn->prepare("INSERT INTO duties (teacher_name, room_number, status) VALUES (?, ?, 'Assigned')");
    $stmt->bind_param("ss", $input['teacher_name'], $input['room_number']);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
    exit;
}
/////////

echo json_encode(["status" => "error", "message" => "Unknown action requested: " . $action]);
$conn->close();
?>
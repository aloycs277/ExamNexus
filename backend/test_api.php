<?php
// test_api.php - Test file to debug API responses

$url = "http://localhost/Exam/backend/api.php?action=getUsers";

// Initialize curl
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $header_size);
$body = substr($response, $header_size);

curl_close($ch);

echo "=== HEADERS ===\n";
echo $headers . "\n";
echo "=== BODY ===\n";
echo $body . "\n";
echo "=== BODY LENGTH ===\n";
echo strlen($body) . " bytes\n";

// Try to parse JSON
$json = json_decode($body, true);
if ($json === null) {
    echo "=== JSON PARSE ERROR ===\n";
    echo "Error: " . json_last_error_msg() . "\n";
} else {
    echo "=== PARSED JSON ===\n";
    print_r($json);
}
?>
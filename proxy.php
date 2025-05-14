<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url = 'http://www.koeri.boun.edu.tr/scripts/lst4.asp';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
curl_setopt($ch, CURLOPT_ENCODING, ''); // Accept any encoding

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($httpCode === 200 && !empty($response)) {
    // Convert response to UTF-8 if needed
    if (!mb_check_encoding($response, 'UTF-8')) {
        $response = mb_convert_encoding($response, 'UTF-8', 'ISO-8859-9');
    }
    
    // Clean the response
    $response = preg_replace('/[\x00-\x1F\x7F]/u', '', $response);
    
    // Extract the table content
    if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $response, $matches)) {
        $data = trim($matches[1]);
    } else {
        $data = $response;
    }
    
    // Log the first few lines for debugging
    $debugLines = array_slice(explode("\n", $data), 0, 10);
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'debug' => [
            'first_lines' => $debugLines,
            'total_lines' => count(explode("\n", $data))
        ],
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch data',
        'details' => $error ?: 'HTTP Code: ' . $httpCode,
        'timestamp' => date('c')
    ]);
} 
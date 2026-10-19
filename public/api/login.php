<?php
/**
 * TripPool Nepal - Direct Database Login & Registration Endpoint (PHP / cPanel)
 */

require_once __DIR__ . '/db.php';

$data = getRequestData();
$action = $data['action'] ?? ($_GET['action'] ?? 'login');

if ($action === 'register') {
    $email = trim($data['email'] ?? '');
    $name = trim($data['name'] ?? '');
    $password = $data['password'] ?? '';
    $role = ($data['role'] ?? 'member') === 'leader' ? 'leader' : 'member';

    if (empty($email) || empty($name) || strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Valid email, name, and password (min 6 chars) are required."]);
        exit();
    }

    try {
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(["success" => false, "error" => "An account with this email already exists in the database."]);
            exit();
        }

        $salt = bin2hex(random_bytes(16));
        $hash = hash_pbkdf2('sha256', $password, $salt, 100000, 64);
        $userId = 'user_' . time() . '_' . bin2hex(random_bytes(3));
        $memberId = $role === 'leader' ? 1 : null;

        // Link to existing member by name if found
        $mStmt = $pdo->prepare("SELECT id FROM members WHERE LOWER(name) = LOWER(:name) LIMIT 1");
        $mStmt->execute([':name' => $name]);
        $existingMember = $mStmt->fetch();
        if ($existingMember) {
            $memberId = (int)$existingMember['id'];
        }

        $insertStmt = $pdo->prepare("INSERT INTO users (id, email, name, role, member_id, password_hash, password_salt, created_at) VALUES (:id, :email, :name, :role, :member_id, :hash, :salt, NOW())");
        $insertStmt->execute([
            ':id' => $userId,
            ':email' => strtolower($email),
            ':name' => $name,
            ':role' => $role,
            ':member_id' => $memberId,
            ':hash' => $hash,
            ':salt' => $salt
        ]);

        $token = bin2hex(random_bytes(24));
        $session = [
            "user" => [
                "id" => $userId,
                "email" => strtolower($email),
                "name" => $name,
                "role" => $role,
                "member_id" => $memberId
            ],
            "token" => $token,
            "loginAt" => date('Y-m-d\TH:i:s\Z')
        ];

        echo json_encode(["success" => true, "session" => $session]);
        exit();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Database registration error: " . $e->getMessage()]);
        exit();
    }
}

$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Email address and password are required."]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id, email, name, role, member_id, password_hash, password_salt FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Invalid email or password."]);
        exit();
    }

    $isValid = false;
    $needsUpgrade = false;

    // Recognize initial seeded accounts
    if (
        $password === 'Trip@2026' &&
        (
            $user['password_hash'] === 'pbkdf2_seeded_2026' ||
            strpos($user['password_hash'], 'seeded') !== false ||
            strpos($user['password_hash'], '2f3e8b4e78a2d12f2026') === 0
        )
    ) {
        $isValid = true;
        $needsUpgrade = true;
    } else {
        $storedHash = (string)$user['password_hash'];
        $saltStr = (string)$user['password_salt'];

        // 1. Standard PBKDF2-SHA256 verification
        $pbkdf2Calc = hash_pbkdf2('sha256', $password, $saltStr, 100000, 64);
        $pbkdf2BinSaltCalc = (ctype_xdigit($saltStr) && strlen($saltStr) % 2 === 0)
            ? hash_pbkdf2('sha256', $password, hex2bin($saltStr), 100000, 64)
            : '';

        // 2. phpMyAdmin SQL / Function helpers (SHA2 with salt, SHA2 raw, MD5, bcrypt, or direct plain text edit)
        $sha256WithSalt = hash('sha256', $password . $saltStr);
        $sha256Raw = hash('sha256', $password);
        $md5Raw = md5($password);

        if (
            hash_equals($storedHash, $pbkdf2Calc) ||
            ($pbkdf2BinSaltCalc !== '' && hash_equals($storedHash, $pbkdf2BinSaltCalc))
        ) {
            $isValid = true;
        } elseif (
            hash_equals(strtolower($storedHash), $sha256WithSalt) ||
            hash_equals(strtolower($storedHash), $sha256Raw) ||
            hash_equals(strtolower($storedHash), $md5Raw) ||
            password_verify($password, $storedHash) ||
            hash_equals($storedHash, $password)
        ) {
            // Password was updated via phpMyAdmin; accept and auto-upgrade to full PBKDF2-SHA256
            $isValid = true;
            $needsUpgrade = true;
        }
    }

    if ($isValid && $needsUpgrade) {
        $newSalt = bin2hex(random_bytes(16));
        $newHash = hash_pbkdf2('sha256', $password, $newSalt, 100000, 64);
        $upStmt = $pdo->prepare("UPDATE users SET password_hash = :hash, password_salt = :salt WHERE id = :id");
        $upStmt->execute([':hash' => $newHash, ':salt' => $newSalt, ':id' => $user['id']]);
    }

    if (!$isValid) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Incorrect password. Please check your credentials."]);
        exit();
    }

    $token = bin2hex(random_bytes(24));
    $session = [
        "user" => [
            "id" => $user['id'],
            "email" => $user['email'],
            "name" => $user['name'],
            "role" => $user['role'],
            "member_id" => $user['member_id'] ? (int)$user['member_id'] : null
        ],
        "token" => $token,
        "loginAt" => date('Y-m-d\TH:i:s\Z')
    ];

    echo json_encode(["success" => true, "session" => $session]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database authentication error: " . $e->getMessage()]);
}

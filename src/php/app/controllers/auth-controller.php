<?php
declare(strict_types=1);

namespace App\Controllers;

use App;
use App\Queries;
use PDOException;

final class AuthController {
    public static function register(): void {
        $firstName = trim((string)($_POST['first_name'] ?? ''));
        $lastName = trim((string)($_POST['last_name'] ?? ''));
        $studentId = trim((string)($_POST['username'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');

        if ($firstName === '' || $lastName === '' || $studentId === '' || $email === '' || $password === '') {
            App\flash('error', 'Complete all required fields.');
            App\redirect('/login?mode=register');
            return;
        }

        if ($password !== $confirm) {
            App\flash('error', 'Passwords do not match.');
            App\redirect('/login?mode=register');
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        if (!$hash) {
            App\flash('error', 'Unable to create account. Please try again.');
            App\redirect('/login?mode=register');
            return;
        }

        try {
            Queries\insertStudent(App\db(), $studentId, $firstName . ' ' . $lastName, $email, $hash);
            App\flash('success', 'Account created successfully. Please sign in.');
            App\redirect('/login');
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? null) === 1062) {
                App\flash('error', 'Email or student ID already taken.');
                App\redirect('/login?mode=register');
                return;
            }
            App\flash('error', 'Unable to create account right now.');
            App\redirect('/login?mode=register');
        }
    }

    public static function login(): void {
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            App\flash('error', 'Invalid email or password.');
            App\redirect('/login');
            return;
        }

        $user = Queries\findUserByEmail(App\db(), $email);
        if (!$user) {
            App\flash('error', 'Invalid email or password.');
            App\redirect('/login');
            return;
        }

        if (!password_verify($password, (string)($user['password'] ?? ''))) {
            App\flash('error', 'Invalid email or password.');
            App\redirect('/login');
            return;
        }

        $_SESSION['user'] = [
            'id' => (int)$user['id'],
            'fullName' => (string)$user['full_name'],
            'role' => (string)$user['role'],
            'sectionId' => $user['section_id'] === null ? null : (int)$user['section_id'],
            'sectionName' => (string)$user['section_name']
        ];

        DashboardController::redirectToRoleDashboard();
    }

    public static function logout(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        App\redirect('/');
    }
}


<?php
declare(strict_types=1);

namespace App\Controllers;

use App;
use App\Queries;

final class DashboardController {
    public static function redirectToRoleDashboard(): void {
        $user = App\currentUser();
        if (!$user) {
            App\redirect('/login');
            return;
        }

        $role = (string)($user['role'] ?? 'student');
        if (in_array($role, ['admin', 'executive'], true)) {
            App\redirect('/executive/dashboard');
            return;
        }
        if (in_array($role, ['rep', 'representative'], true)) {
            App\redirect('/representative/dashboard');
            return;
        }
        App\redirect('/student/dashboard');
    }

    public static function executiveDashboard(): void {
        $user = App\currentUser();
        if (!$user) {
            App\redirect('/login');
            return;
        }
        if (!in_array((string)$user['role'], ['admin', 'executive'], true)) {
            App\abort(403, 'Forbidden', 'You do not have access to this page.');
        }

        $summary = Queries\getLandingSummary(App\db());
        $sections = Queries\getLandingSections(App\db());
        App\render('dashboard-executive', [
            'title' => 'Executive Dashboard',
            'summary' => $summary,
            'sections' => $sections
        ]);
    }

    public static function studentDashboard(): void {
        $user = App\currentUser();
        if (!$user) {
            App\redirect('/login');
            return;
        }
        App\render('dashboard-student', [
            'title' => 'Student Dashboard'
        ]);
    }

    public static function representativeDashboard(): void {
        $user = App\currentUser();
        if (!$user) {
            App\redirect('/login');
            return;
        }
        App\render('dashboard-representative', [
            'title' => 'Representative Dashboard'
        ]);
    }
}


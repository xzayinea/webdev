<?php
require_once 'header.php';
require_once '../config/database.php';

$message = '';
$editUser = null;

if(isset($_GET['edit'])) {
    $editId = (int)$_GET['edit'];
    $stmt = $pdo->prepare("SELECT id,name,email,role FROM users WHERE id = ?");
    $stmt->execute([$editId]);
    $editUser = $stmt->fetch();
}

if(isset($_POST['add_user'])) {
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $password = trim($_POST['password']);
    $role = $_POST['role'];

    if($name && $email && $password) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (name,email,password,role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hash, $role]);
        header('Location: users.php');
        exit();
    }
}

if(isset($_POST['update_user'])) {
    $id = (int)$_POST['user_id'];
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $role = $_POST['role'];

    if($name && $email) {
        $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?");
        $stmt->execute([$name, $email, $role, $id]);
        header('Location: users.php');
        exit();
    }
}

if(isset($_POST['delete_user'])) {
    $id = (int)$_POST['user_id'];
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    header('Location: users.php');
    exit();
}

$users = $pdo->query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC")->fetchAll();
?>
    <section>
        <h3>Manage Users</h3>
        <form method="POST" class="card">
            <h4><?php echo $editUser ? 'Edit User' : 'Add New User'; ?></h4>
            <?php if($editUser): ?>
                <input type="hidden" name="user_id" value="<?php echo $editUser['id']; ?>">
            <?php endif; ?>
            <input type="text" name="name" placeholder="Name" required value="<?php echo $editUser ? htmlspecialchars($editUser['name']) : ''; ?>">
            <input type="email" name="email" placeholder="Email" required value="<?php echo $editUser ? htmlspecialchars($editUser['email']) : ''; ?>">
            <?php if(!$editUser): ?>
                <input type="password" name="password" placeholder="Password" required>
            <?php endif; ?>
            <select name="role" required>
                <option value="student"<?php echo $editUser && $editUser['role'] === 'student' ? ' selected' : ''; ?>>Student</option>
                <option value="representative"<?php echo $editUser && $editUser['role'] === 'representative' ? ' selected' : ''; ?>>Representative</option>
                <option value="executive"<?php echo $editUser && $editUser['role'] === 'executive' ? ' selected' : ''; ?>>Executive</option>
                <option value="admin"<?php echo $editUser && $editUser['role'] === 'admin' ? ' selected' : ''; ?>>Admin</option>
            </select>
            <?php if($editUser): ?>
                <button type="submit" name="update_user">Save Changes</button>
                <a href="users.php" class="button-link">Cancel</a>
            <?php else: ?>
                <button type="submit" name="add_user">Create User</button>
            <?php endif; ?>
        </form>

        <div class="card">
            <h4>Existing Users</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    <?php foreach($users as $user): ?>
                    <tr>
                        <td><?php echo $user['id']; ?></td>
                        <td><?php echo htmlspecialchars($user['name']); ?></td>
                        <td><?php echo htmlspecialchars($user['email']); ?></td>
                        <td><?php echo $user['role']; ?></td>
                        <td><?php echo $user['created_at']; ?></td>
                        <td>
                            <a href="users.php?edit=<?php echo $user['id']; ?>">Edit</a>
                            <form method="POST" style="display:inline-block;margin:0;">
                                <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>;">
                                <button type="submit" name="delete_user" onclick="return confirm('Delete this user?');">Delete</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
</main>
</body>
</html>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
</main>
</body>
</html>

<?php
require_once 'header.php';
require_once '../config/database.php';

$editItem = null;
$errors = [];

if (isset($_GET['edit'])) {
    $editId = (int)$_GET['edit'];
    $stmt = $pdo->prepare("SELECT id, item_type, title, description FROM homepage_items WHERE id = ?");
    $stmt->execute([$editId]);
    $editItem = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (isset($_POST['add_item'])) {
    $item_type = $_POST['item_type'] ?? 'accomplishment';
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if ($title === '' || $description === '') {
        $errors[] = 'Both title and description are required.';
    } else {
        $stmt = $pdo->prepare("INSERT INTO homepage_items (item_type, title, description) VALUES (?, ?, ?)");
        $stmt->execute([$item_type, $title, $description]);
        header('Location: homepage.php');
        exit();
    }
}

if (isset($_POST['update_item'])) {
    $id = (int)$_POST['item_id'];
    $item_type = $_POST['item_type'] ?? 'accomplishment';
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if ($title === '' || $description === '') {
        $errors[] = 'Both title and description are required.';
    } else {
        $stmt = $pdo->prepare("UPDATE homepage_items SET item_type = ?, title = ?, description = ? WHERE id = ?");
        $stmt->execute([$item_type, $title, $description, $id]);
        header('Location: homepage.php');
        exit();
    }
}

if (isset($_POST['delete_item'])) {
    $id = (int)$_POST['item_id'];
    $stmt = $pdo->prepare("DELETE FROM homepage_items WHERE id = ?");
    $stmt->execute([$id]);
    header('Location: homepage.php');
    exit();
}

$items = [];
try {
    $items = $pdo->query("SELECT id, item_type, title, description, created_at FROM homepage_items ORDER BY item_type, id DESC")->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $errors[] = 'Unable to load homepage items. Please make sure the homepage_items table exists.';
}
?>
    <section>
        <h3>Manage Homepage Content</h3>
        <?php if ($errors): ?>
            <div class="alert alert-error">
                <?php echo htmlspecialchars(implode(' ', $errors)); ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="card">
            <h4><?php echo $editItem ? 'Edit Homepage Item' : 'Add Homepage Item'; ?></h4>
            <label>Type</label>
            <select name="item_type" required>
                <option value="accomplishment"<?php echo $editItem && $editItem['item_type'] === 'accomplishment' ? ' selected' : ''; ?>>Accomplishment</option>
                <option value="event"<?php echo $editItem && $editItem['item_type'] === 'event' ? ' selected' : ''; ?>>Event</option>
            </select>

            <label>Title</label>
            <input type="text" name="title" value="<?php echo $editItem ? htmlspecialchars($editItem['title']) : ''; ?>" placeholder="Title" required>

            <label>Description</label>
            <textarea name="description" placeholder="Description" required><?php echo $editItem ? htmlspecialchars($editItem['description']) : ''; ?></textarea>

            <?php if ($editItem): ?>
                <input type="hidden" name="item_id" value="<?php echo $editItem['id']; ?>">
                <button type="submit" name="update_item" class="btn-primary">Save Item</button>
                <a href="homepage.php" class="button-link">Cancel</a>
            <?php else: ?>
                <button type="submit" name="add_item" class="btn-primary">Add Item</button>
            <?php endif; ?>
        </form>

        <div class="card">
            <h4>Existing Homepage Items</h4>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($items): ?>
                        <?php foreach ($items as $item): ?>
                            <tr>
                                <td><?php echo $item['id']; ?></td>
                                <td><?php echo htmlspecialchars(ucfirst($item['item_type'])); ?></td>
                                <td><?php echo htmlspecialchars($item['title']); ?></td>
                                <td><?php echo htmlspecialchars($item['description']); ?></td>
                                <td>
                                    <a href="homepage.php?edit=<?php echo $item['id']; ?>">Edit</a>
                                    <form method="POST" style="display:inline-block; margin:0;">
                                        <input type="hidden" name="item_id" value="<?php echo $item['id']; ?>">
                                        <button type="submit" name="delete_item" onclick="return confirm('Delete this item?');">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr><td colspan="5">No homepage content added yet.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </section>
</main>
</body>
</html>

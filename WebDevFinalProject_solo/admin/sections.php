<?php
require_once 'header.php';
require_once '../config/database.php';

$editSection = null;

if(isset($_GET['edit'])) {
    $editId = (int)$_GET['edit'];
    $stmt = $pdo->prepare("SELECT id,name,description FROM sections WHERE id = ?");
    $stmt->execute([$editId]);
    $editSection = $stmt->fetch();
}

if(isset($_POST['add_section'])) {
    $name = trim($_POST['name']);
    $description = trim($_POST['description']);

    if($name) {
        $stmt = $pdo->prepare("INSERT INTO sections (name,description) VALUES (?, ?)");
        $stmt->execute([$name, $description]);
        header('Location: sections.php');
        exit();
    }
}

if(isset($_POST['update_section'])) {
    $id = (int)$_POST['section_id'];
    $name = trim($_POST['name']);
    $description = trim($_POST['description']);

    if($name) {
        $stmt = $pdo->prepare("UPDATE sections SET name = ?, description = ? WHERE id = ?");
        $stmt->execute([$name, $description, $id]);
        header('Location: sections.php');
        exit();
    }
}

if(isset($_POST['delete_section'])) {
    $id = (int)$_POST['section_id'];
    $stmt = $pdo->prepare("DELETE FROM sections WHERE id = ?");
    $stmt->execute([$id]);
    header('Location: sections.php');
    exit();
}

$sections = $pdo->query("SELECT id,name,description FROM sections ORDER BY id ASC")->fetchAll();
?>
    <section>
        <h3>Manage Sections</h3>
        <form method="POST" class="card">
            <h4><?php echo $editSection ? 'Edit Section' : 'Add Section'; ?></h4>
            <?php if($editSection): ?>
                <input type="hidden" name="section_id" value="<?php echo $editSection['id']; ?>">
            <?php endif; ?>
            <input type="text" name="name" placeholder="Section Name" required value="<?php echo $editSection ? htmlspecialchars($editSection['name']) : ''; ?>">
            <textarea name="description" placeholder="Description"><?php echo $editSection ? htmlspecialchars($editSection['description']) : ''; ?></textarea>
            <?php if($editSection): ?>
                <button type="submit" name="update_section">Save Section</button>
                <a href="sections.php" class="button-link">Cancel</a>
            <?php else: ?>
                <button type="submit" name="add_section">Add Section</button>
            <?php endif; ?>
        </form>

        <div class="card">
            <h4>Available Sections</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Description</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    <?php foreach($sections as $section): ?>
                        <tr>
                            <td><?php echo $section['id']; ?></td>
                            <td><?php echo htmlspecialchars($section['name']); ?></td>
                            <td><?php echo htmlspecialchars($section['description']); ?></td>
                            <td>
                                <a href="sections.php?edit=<?php echo $section['id']; ?>">Edit</a>
                                <form method="POST" style="display:inline-block;margin:0;">
                                    <input type="hidden" name="section_id" value="<?php echo $section['id']; ?>">
                                    <button type="submit" name="delete_section" onclick="return confirm('Delete this section?');">Delete</button>
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

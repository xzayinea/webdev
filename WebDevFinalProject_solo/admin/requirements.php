<?php
require_once 'header.php';
require_once '../config/database.php';

$sections = $pdo->query("SELECT id,name FROM sections ORDER BY name ASC")->fetchAll();
$editRequirement = null;

if(isset($_GET['edit'])) {
    $editId = (int)$_GET['edit'];
    $stmt = $pdo->prepare("SELECT id,section_id,name,description FROM requirements WHERE id = ?");
    $stmt->execute([$editId]);
    $editRequirement = $stmt->fetch();
}

if(isset($_POST['add_requirement'])) {
    $section_id = (int)$_POST['section_id'];
    $name = trim($_POST['name']);
    $description = trim($_POST['description']);

    if($section_id && $name) {
        $stmt = $pdo->prepare("INSERT INTO requirements (section_id,name,description) VALUES (?, ?, ?)");
        $stmt->execute([$section_id, $name, $description]);
        header('Location: requirements.php');
        exit();
    }
}

if(isset($_POST['update_requirement'])) {
    $id = (int)$_POST['requirement_id'];
    $section_id = (int)$_POST['section_id'];
    $name = trim($_POST['name']);
    $description = trim($_POST['description']);

    if($section_id && $name) {
        $stmt = $pdo->prepare("UPDATE requirements SET section_id = ?, name = ?, description = ? WHERE id = ?");
        $stmt->execute([$section_id, $name, $description, $id]);
        header('Location: requirements.php');
        exit();
    }
}

if(isset($_POST['delete_requirement'])) {
    $id = (int)$_POST['requirement_id'];
    $stmt = $pdo->prepare("DELETE FROM requirements WHERE id = ?");
    $stmt->execute([$id]);
    header('Location: requirements.php');
    exit();
}

$requirements = $pdo->query("SELECT r.id,r.name,r.description,s.name AS section_name FROM requirements r JOIN sections s ON r.section_id = s.id ORDER BY r.id DESC")->fetchAll();
?>
    <section>
        <h3>Manage Requirements</h3>
        <form method="POST" class="card">
            <h4><?php echo $editRequirement ? 'Edit Requirement' : 'Add Requirement'; ?></h4>
            <select name="section_id" required>
                <option value="">Choose Section</option>
                <?php foreach($sections as $section): ?>
                    <option value="<?php echo $section['id']; ?>"<?php echo $editRequirement && $editRequirement['section_id'] == $section['id'] ? ' selected' : ''; ?>><?php echo htmlspecialchars($section['name']); ?></option>
                <?php endforeach; ?>
            </select>
            <input type="text" name="name" placeholder="Requirement Name" required value="<?php echo $editRequirement ? htmlspecialchars($editRequirement['name']) : ''; ?>">
            <textarea name="description" placeholder="Description"><?php echo $editRequirement ? htmlspecialchars($editRequirement['description']) : ''; ?></textarea>
            <?php if($editRequirement): ?>
                <input type="hidden" name="requirement_id" value="<?php echo $editRequirement['id']; ?>">
                <button type="submit" name="update_requirement">Save Requirement</button>
                <a href="requirements.php" class="button-link">Cancel</a>
            <?php else: ?>
                <button type="submit" name="add_requirement">Add Requirement</button>
            <?php endif; ?>
        </form>

        <div class="card">
            <h4>Existing Requirements</h4>
            <table>
                <thead>
                    <tr><th>ID</th><th>Requirement</th><th>Section</th><th>Description</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    <?php foreach($requirements as $item): ?>
                        <tr>
                            <td><?php echo $item['id']; ?></td>
                            <td><?php echo htmlspecialchars($item['name']); ?></td>
                            <td><?php echo htmlspecialchars($item['section_name']); ?></td>
                            <td><?php echo htmlspecialchars($item['description']); ?></td>
                            <td>
                                <a href="requirements.php?edit=<?php echo $item['id']; ?>">Edit</a>
                                <form method="POST" style="display:inline-block;margin:0;">
                                    <input type="hidden" name="requirement_id" value="<?php echo $item['id']; ?>">
                                    <button type="submit" name="delete_requirement" onclick="return confirm('Delete this requirement?');">Delete</button>
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

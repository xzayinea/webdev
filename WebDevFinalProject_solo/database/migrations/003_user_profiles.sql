ALTER TABLE users
  ADD COLUMN profile_bio VARCHAR(280) NULL AFTER document_path,
  ADD COLUMN profile_status VARCHAR(80) NULL AFTER profile_bio,
  ADD COLUMN profile_avatar_path VARCHAR(255) NULL AFTER profile_status,
  ADD COLUMN profile_banner_path VARCHAR(255) NULL AFTER profile_avatar_path,
  ADD COLUMN profile_accent_color VARCHAR(7) NOT NULL DEFAULT '#2f80ed' AFTER profile_banner_path;

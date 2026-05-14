-- Add type column to landing_highlights (announcement or accomplishment)
ALTER TABLE landing_highlights ADD COLUMN type ENUM('announcement', 'accomplishment') DEFAULT 'announcement' AFTER card_position;

-- Add index for efficient queries
CREATE INDEX idx_type ON landing_highlights(type);

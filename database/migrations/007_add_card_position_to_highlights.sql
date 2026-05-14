-- Add card_position column to landing_highlights to specify which card (1, 2, or 3) to display
ALTER TABLE landing_highlights ADD COLUMN card_position INT DEFAULT NULL AFTER image_path;

-- Add index for efficient queries
CREATE INDEX idx_card_position ON landing_highlights(card_position);

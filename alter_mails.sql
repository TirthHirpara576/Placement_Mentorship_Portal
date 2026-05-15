-- Make mails.tid nullable so admin can send emails without a coordinator tid
ALTER TABLE mails ALTER COLUMN tid DROP NOT NULL;

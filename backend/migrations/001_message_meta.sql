-- Rubric scorecards for the coach and reviewer workflows.
--
-- Scored turns store { "scorecard": { overall, max, criteria[], verdict } } here.
-- Keeping it on the message (rather than on the conversation) means reopening a
-- chat replays every card in place, and the session trend is derived from the
-- message list instead of being state the frontend has to hold.
--
-- Safe to re-run.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta JSONB;

-- sql/010_best_move.sql
ALTER TABLE seasons ADD COLUMN track_best_move BOOLEAN DEFAULT false;

ALTER TABLE games ADD COLUMN best_move_seat_1 INT CHECK (best_move_seat_1 BETWEEN 1 AND 10);
ALTER TABLE games ADD COLUMN best_move_seat_2 INT CHECK (best_move_seat_2 BETWEEN 1 AND 10);
ALTER TABLE games ADD COLUMN best_move_seat_3 INT CHECK (best_move_seat_3 BETWEEN 1 AND 10);

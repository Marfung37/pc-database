| 4b     | 3b              | 7b              | 1b  | 4b        | 1b          | 14b                    | 4b         | 2b                    | 10b       |
| ------ | --------------- | --------------- | --- | --------- | ----------- | ---------------------- | ---------- | --------------------- | --------- |
| PC Num | Duplicate Piece | Leftover Pieces | OQB | Build Len | 4 Duplicate | Piece Counts (TILJSZO) | Fumen Hash | Cover Dependence Hash | Unique ID |

Duplicate Piece map so that 7 -> O, 1 -> T, and 0 is no duplicate piece.

The Piece Counts are actually 3 - count, so that not having that is a larger number. This is to allow for sorting from least to greatest to put the queues in the order TILJSZO.

Same with Leftover Pieces

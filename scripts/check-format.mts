import assert from "node:assert/strict";
import { formatRelativeDate, formatRupiah } from "../src/lib/format.ts";

const now = new Date(2026, 9, 15, 23, 30);

assert.equal(formatRupiah(1234000), "Rp 1.234.000");
assert.equal(formatRupiah(0), "Rp 0");
assert.equal(formatRupiah(-1234000), "-Rp 1.234.000");

assert.equal(formatRelativeDate("2026-10-15", now), "hari ini");
assert.equal(formatRelativeDate("2026-10-14", now), "kemarin");
assert.equal(formatRelativeDate("2026-10-12", now), "3 hari lalu");
assert.equal(formatRelativeDate("2026-10-13", now), "2 hari lalu");
assert.equal(formatRelativeDate("2026-10-16", now), "besok");
assert.equal(formatRelativeDate("2026-10-20", now), "dalam 5 hari");
assert.equal(formatRelativeDate("2026-10-01", now), "2 minggu lalu");
assert.equal(formatRelativeDate("2026-07-15", now), "3 bulan lalu");
assert.equal(formatRelativeDate("2024-10-15", now), "2 tahun lalu");
assert.equal(formatRelativeDate(new Date(2026, 9, 14, 12).toISOString(), now), "kemarin");

console.log("format checks passed");

#!/usr/bin/env bash
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
set -a; . ./.env; set +a
U="$NEXT_PUBLIC_SUPABASE_URL"; K="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
TS=$(date +%s)
DOMAIN="${RLS_TEST_DOMAIN:-gmail.com}"
field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],j);console.log(v??"")}catch{console.log("")}})' "$1"; }
signup() { curl -s "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"rlstest123456\"}"; }
H=(-H "apikey: $K" -H "Content-Type: application/json" -H "Prefer: return=representation")
HMIN=(-H "apikey: $K" -H "Content-Type: application/json" -H "Prefer: return=minimal")
HUP=(-H "apikey: $K" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates,return=representation")
FAILS=0

SA=$(signup "kasbon.rls.a.$TS@$DOMAIN"); TA=$(echo "$SA" | field access_token); AID=$(echo "$SA" | field user.id)
SB=$(signup "kasbon.rls.b.$TS@$DOMAIN"); TB=$(echo "$SB" | field access_token)
[ -z "$TA" ] || [ -z "$TB" ] && { echo "Signup gagal: $SA $SB"; exit 1; }

ID=$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TA" -d '{"type":"owed_to_me","counterpart_name":"Budi","amount":50000}' | field 0.id)
BID=$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TB" -d '{"type":"i_owe","counterpart_name":"Cici","amount":7000}' | field 0.id)
echo "A row: $ID | B row: $BID"

check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 -> $2"; FAILS=$((FAILS+1)); fi; }
denied() { case "$2" in *42501*|*" 401") echo "PASS  $1";; *) echo "FAIL  $1 -> $2"; FAILS=$((FAILS+1));; esac; }
anon() { curl -s -w ' %{http_code}' -X "$1" "$U/rest/v1/debts$2" -H "apikey: $K" -H "Content-Type: application/json" ${3:+-d "$3"}; }
patch_b() { curl -s -X PATCH "$U/rest/v1/debts?id=eq.$BID" "${H[@]}" -H "Authorization: Bearer $TB" -d "$1"; }

check "B select semua cuma lihat row sendiri" "$(curl -s "$U/rest/v1/debts?select=id" "${H[@]}" -H "Authorization: Bearer $TB")" "[{\"id\":\"$BID\"}]"
check "B select row A" "$(curl -s "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"
check "B filter user_id=A" "$(curl -s "$U/rest/v1/debts?user_id=eq.$AID" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"
check "B hitung count=exact cuma row sendiri" "$(curl -s -I "$U/rest/v1/debts" -H "apikey: $K" -H "Prefer: count=exact" -H "Authorization: Bearer $TB" | tr -d '\r' | sed -n 's/^[Cc]ontent-[Rr]ange: .*\///p')" "1"
check "B update row A" "$(curl -s -X PATCH "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB" -d '{"amount":1}')" "[]"
check "B delete row A" "$(curl -s -X DELETE "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"
check "B insert atas nama A" "$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TB" -d "{\"user_id\":\"$AID\",\"type\":\"i_owe\",\"counterpart_name\":\"X\",\"amount\":1}" | field code)" "42501"
check "B pindahkan row sendiri ke A" "$(patch_b "{\"user_id\":\"$AID\"}" | field code)" "42501"
check "B upsert timpa row A" "$(curl -s "$U/rest/v1/debts?on_conflict=id" "${HUP[@]}" -H "Authorization: Bearer $TB" -d "{\"id\":\"$ID\",\"type\":\"i_owe\",\"counterpart_name\":\"Hack\",\"amount\":1}" | field code)" "42501"
check "B upsert timpa row A dengan user_id A" "$(curl -s "$U/rest/v1/debts?on_conflict=id" "${HUP[@]}" -H "Authorization: Bearer $TB" -d "{\"id\":\"$ID\",\"user_id\":\"$AID\",\"type\":\"i_owe\",\"counterpart_name\":\"Hack\",\"amount\":1}" | field code)" "42501"
check "B ubah created_at row sendiri ditolak" "$(patch_b '{"created_at":"2000-01-01T00:00:00Z"}' | field code)" "42501"

S1=$(patch_b "{\"settled_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" | field 0.settled_at)
sleep 1
S2=$(patch_b "{\"settled_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" | field 0.settled_at)
check "B settle dua kali, settled_at pertama dipertahankan (trigger)" "$([ -n "$S1" ] && echo "$S1")" "$S2"

denied "anon POST" "$(anon POST "" '{"type":"i_owe","counterpart_name":"X","amount":1}')"
denied "anon PATCH" "$(anon PATCH "?id=eq.$ID" '{"amount":1}')"
denied "anon DELETE" "$(anon DELETE "?id=eq.$ID")"
check "anon tanpa login" "$(curl -s "$U/rest/v1/debts?select=*" -H "apikey: $K" | field code)" "42501"

check "B blind PATCH amount=gt.0" "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$U/rest/v1/debts?amount=gt.0" "${HMIN[@]}" -H "Authorization: Bearer $TB" -d '{"amount":2}')" "204"
check "B blind DELETE id=not.is.null" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$U/rest/v1/debts?id=not.is.null" "${HMIN[@]}" -H "Authorization: Bearer $TB")" "204"
check "B nggak punya row lagi setelah blind DELETE" "$(curl -s "$U/rest/v1/debts?select=id" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"

check "row A tetap utuh" "$(curl -s "$U/rest/v1/debts?id=eq.$ID&select=amount,settled_at" "${H[@]}" -H "Authorization: Bearer $TA")" '[{"amount":50000,"settled_at":null}]'

curl -s -o /dev/null -X DELETE "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X DELETE "$U/rest/v1/debts?id=eq.$BID" "${H[@]}" -H "Authorization: Bearer $TB"

echo "User uji kasbon.rls.*.$TS@$DOMAIN nggak bisa dihapus pakai anon key, hapus manual dari dashboard Supabase kalau perlu."
if [ "$FAILS" -gt 0 ]; then echo "$FAILS check GAGAL"; exit 1; fi
echo "Semua check lolos"

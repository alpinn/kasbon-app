#!/usr/bin/env bash
set -u
set -a; . ./.env; set +a
U="$NEXT_PUBLIC_SUPABASE_URL"; K="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
TS=$(date +%s)
DOMAIN="${RLS_TEST_DOMAIN:-gmail.com}"
field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],j);console.log(v??"")}catch{console.log("")}})' "$1"; }
signup() { curl -s "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"rlstest123456\"}"; }
H=(-H "apikey: $K" -H "Content-Type: application/json" -H "Prefer: return=representation")

SA=$(signup "kasbon.rls.a.$TS@$DOMAIN"); TA=$(echo "$SA" | field access_token); AID=$(echo "$SA" | field user.id)
SB=$(signup "kasbon.rls.b.$TS@$DOMAIN"); TB=$(echo "$SB" | field access_token)
[ -z "$TA" ] || [ -z "$TB" ] && { echo "Signup gagal: $SA $SB"; exit 1; }

ID=$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TA" -d '{"type":"owed_to_me","counterpart_name":"Budi","amount":50000}' | field 0.id)
BID=$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TB" -d '{"type":"i_owe","counterpart_name":"Cici","amount":7000}' | field 0.id)
echo "A row: $ID | B row: $BID"

check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 -> $2"; fi; }
check "B select semua cuma lihat row sendiri" "$(curl -s "$U/rest/v1/debts?select=id" "${H[@]}" -H "Authorization: Bearer $TB")" "[{\"id\":\"$BID\"}]"
check "B select row A" "$(curl -s "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"
check "B update row A" "$(curl -s -X PATCH "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB" -d '{"amount":1}')" "[]"
check "B delete row A" "$(curl -s -X DELETE "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TB")" "[]"
check "B insert atas nama A" "$(curl -s "$U/rest/v1/debts" "${H[@]}" -H "Authorization: Bearer $TB" -d "{\"user_id\":\"$AID\",\"type\":\"i_owe\",\"counterpart_name\":\"X\",\"amount\":1}" | field code)" "42501"
check "B pindahkan row sendiri ke A" "$(curl -s -X PATCH "$U/rest/v1/debts?id=eq.$BID" "${H[@]}" -H "Authorization: Bearer $TB" -d "{\"user_id\":\"$AID\"}" | field code)" "42501"
check "anon tanpa login" "$(curl -s "$U/rest/v1/debts?select=*" -H "apikey: $K" | field code)" "42501"
check "row A tetap utuh" "$(curl -s "$U/rest/v1/debts?id=eq.$ID&select=amount" "${H[@]}" -H "Authorization: Bearer $TA")" '[{"amount":50000}]'

curl -s -o /dev/null -X DELETE "$U/rest/v1/debts?id=eq.$ID" "${H[@]}" -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X DELETE "$U/rest/v1/debts?id=eq.$BID" "${H[@]}" -H "Authorization: Bearer $TB"

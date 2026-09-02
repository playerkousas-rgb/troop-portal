#!/usr/bin/env bash
# 確保「模板下載」提供的 GS 檔同 gs/ 原始碼一致。
# 每次改咗 gs/SCOUTSYSTEM_2_SETUP.gs 都要同步 public/downloads/，
# 否則旅團下載到的係舊版後台（會缺少新 action / 欄位）。
set -e
SRC="gs/SCOUTSYSTEM_2_SETUP.gs"
DST="public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt"
if ! diff -q "$SRC" "$DST" > /dev/null; then
  echo "❌ GS 模板未同步：請執行  cp $SRC $DST"
  exit 1
fi
echo "✅ GS 模板已同步"

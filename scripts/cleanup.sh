#!/bin/bash
set -e  # 遇到错误立即退出

PROJECT_ROOT=$(git rev-parse --show-toplevel)

# 清空 build 目录下的所有文件和子目录，但保留 build 目录本身
BUILD_DIR="$PROJECT_ROOT/build"
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Cleaning up files in build directory..."
    rm -rf "$BUILD_DIR"/*
    echo "✅ All files in build directory cleaned."
else
    echo "ℹ️ Build directory does not exist, skipping."
fi

# 删除 powers of tau 阶段生成的文件
POWERS_OF_TAU_FILES=("pot12_0000.ptau" "pot12_0001.ptau" "powersOfTau28_hez_final_10.ptau")
for FILE in "${POWERS_OF_TAU_FILES[@]}"
do
    if [ -f "$FILE" ]; then
        echo "🧹 Deleting $FILE..."
        rm "$FILE"
        echo "✅ $FILE deleted."
    else
        echo "ℹ️ $FILE does not exist, skipping."
    fi
done

echo "✅ All cleanup completed."
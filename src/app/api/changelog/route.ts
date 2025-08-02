import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const changelogPath = path.join(
      process.cwd(),
      "src",
      "content",
      "changelog",
      "CHANGELOG.md"
    );
    const changelogContent = fs.readFileSync(changelogPath, "utf-8");

    return new NextResponse(changelogContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error reading changelog:", error);
    return new NextResponse(
      "# 更新ログ\n\n更新ログの読み込みに失敗しました。",
      {
        status: 500,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
        },
      }
    );
  }
}

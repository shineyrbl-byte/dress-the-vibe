import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ youcam: Boolean(process.env.YOUCAM_API_KEY) });
}

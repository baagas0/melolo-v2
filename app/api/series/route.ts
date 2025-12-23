import { NextResponse } from "next/server"
import { getAllSeries } from "@/lib/db"

export async function GET() {
  try {
    const series = await getAllSeries()
    return NextResponse.json({ series })
  } catch (error) {
    console.error("Error fetching series:", error)
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 })
  }
}

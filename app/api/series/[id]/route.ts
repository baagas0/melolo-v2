import { type NextRequest, NextResponse } from "next/server"
import { deleteSeries, getSeriesById } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const series = await getSeriesById(Number.parseInt(id))
    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 })
    }
    return NextResponse.json(series)
  } catch (error) {
    console.error("Error fetching series:", error)
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteSeries(Number.parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting series:", error)
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 })
  }
}

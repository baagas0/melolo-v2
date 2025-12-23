import { type NextRequest, NextResponse } from "next/server"
import { searchBooks } from "@/lib/melolo-api"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const offset = Number.parseInt(searchParams.get("offset") || "0")
  const limit = Number.parseInt(searchParams.get("limit") || "20")

  try {
    const data = await searchBooks({ offset, limit })

    // Extract book/series items from the response
    const items =
      data?.data?.cell?.books?.map((book: any) => ({
        series_id: book.book_id,
        cover_url: book.thumb_url,
        title: book.book_name,
        intro: book.abstract || "",
        episode_count: book.serial_count || 0,
      })) || []

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to search" }, { status: 500 })
  }
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface SearchResult {
  series_id: string
  cover_url: string
  title: string
  intro: string
  episode_count: number
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchResults = async (newOffset = 0) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/search?offset=${newOffset}&limit=20`)
      const data = await response.json()

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }

      const items: SearchResult[] = data.items || []
      if (newOffset === 0) {
        setResults(items)
      } else {
        setResults((prev) => [...prev, ...items])
      }
      setHasMore(items.length === 20)
      setOffset(newOffset)
    } catch {
      toast({ title: "Error", description: "Failed to fetch results", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSeries = async (seriesId: string) => {
    setSavingId(seriesId)
    try {
      const response = await fetch("/api/series/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      })
      const data = await response.json()

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: `Series saved with ${data.episodeCount} episodes` })
      }
    } catch {
      toast({ title: "Error", description: "Failed to save series", variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Search Melolo</h1>
              <p className="text-sm text-muted-foreground">Browse series from the API</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <Button onClick={() => fetchResults(0)} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Load Series from API
          </Button>
        </div>

        {results.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click the button above to load series from Melolo API</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <Card key={item.series_id} className="overflow-hidden">
              <div className="aspect-[2/3] relative">
                <img
                  src={item.cover_url || "/placeholder.svg?height=300&width=200&query=video cover"}
                  alt={item.title}
                  className="object-cover w-full h-full"
                />
                <Badge className="absolute top-2 right-2">{item.episode_count} eps</Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.intro}</p>
                <div className="flex gap-2">
                  <Link href={`/series/${item.series_id}?source=api`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => handleSaveSeries(item.series_id)}
                    disabled={savingId === item.series_id}
                  >
                    {savingId === item.series_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length > 0 && hasMore && (
          <div className="flex justify-center mt-8">
            <Button onClick={() => fetchResults(offset + 20)} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load More
            </Button>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  )
}

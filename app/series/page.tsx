"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Database, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { Series } from "@/lib/types"

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const response = await fetch("/api/series")
      const data = await response.json()
      setSeries(data.series || [])
    } catch {
      toast({ title: "Error", description: "Failed to fetch series", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/series/${id}`, { method: "DELETE" })
      if (response.ok) {
        setSeries((prev) => prev.filter((s) => s.id !== id))
        toast({ title: "Deleted", description: "Series removed from database" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete series", variant: "destructive" })
    } finally {
      setDeletingId(null)
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
              <h1 className="text-2xl font-bold">My Series</h1>
              <p className="text-sm text-muted-foreground">{series.length} series in database</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No series saved yet</p>
            <Link href="/search">
              <Button className="mt-4">Search for Series</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {series.map((item) => (
              <Card key={item.id} className="overflow-hidden">
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
                    <Link href={`/series/${item.id}?source=db`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Toaster />
    </div>
  )
}

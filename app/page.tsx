import Link from "next/link"
import { Search, Database, Film } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">Melolo Video Scraper</h1>
          <p className="text-muted-foreground mt-1">Search, save, and download videos from Melolo</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/search">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Search</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Search for series from the Melolo API. Browse available content and add to your library.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/series">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>My Series</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  View all saved series from your database. Manage your video library collection.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/search">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Film className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Download</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Download series covers, episode thumbnails, and video files for offline viewing.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted">
          <h2 className="text-xl font-semibold mb-4">How to use</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to <strong>Search</strong> to find series from the Melolo API
            </li>
            <li>Click on a series to view details and save it to your database</li>
            <li>
              Visit <strong>My Series</strong> to see all saved series
            </li>
            <li>Open series details to download covers and videos</li>
          </ol>
        </div>
      </main>
    </div>
  )
}

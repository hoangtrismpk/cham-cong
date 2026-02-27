export default function Loading() {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-background">
            {/* Mobile Header Skeleton */}
            <header className="lg:hidden h-20 w-full flex items-center justify-between px-6 border-b border-border bg-card/50">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="w-32 h-6 rounded-md bg-muted animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            </header>

            {/* Main Skeleton Area */}
            <main className="flex-1 w-full p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* Main Checkin Card */}
                <div className="bg-card rounded-[2rem] border border-border p-6 md:p-12 h-[300px] w-full animate-pulse flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-4 w-full md:w-1/2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-12 w-48 bg-muted rounded" />
                        <div className="h-6 w-32 bg-muted rounded" />
                    </div>
                    <div className="w-48 h-48 rounded-full bg-muted/50" />
                </div>

                {/* Bottom Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border h-[200px] w-full animate-pulse" />
                    <div className="lg:col-span-1 bg-card rounded-[2rem] border border-border h-[200px] w-full animate-pulse" />
                </div>
            </main>

            {/* Mobile Bottom Nav Skeleton */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-t border-border flex justify-around items-center px-6 z-50">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                ))}
            </div>
        </div>
    )
}

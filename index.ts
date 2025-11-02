import { getFormattedRouteData } from "./lib/routes.js";

// Bun server
const server = Bun.serve({
    port: 3000,
    idleTimeout: 120, // 2 minutes timeout for slow API calls
    async fetch(req) {
        const url = new URL(req.url);

        // CORS headers
        const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        };

        // Handle CORS preflight
        if (req.method === "OPTIONS") {
            return new Response(null, { headers });
        }

        // GET /routes - Get all light rail route data with timings
        if (url.pathname === "/routes" && req.method === "GET") {
            try {
                console.log("Fetching route data...");
                const data = await getFormattedRouteData();
                console.log("Route data fetched successfully");
                return new Response(JSON.stringify(data), { headers });
            } catch (error) {
                console.error("Error fetching routes:", error);
                return new Response(
                    JSON.stringify({ error: "Failed to fetch route data" }),
                    { status: 500, headers }
                );
            }
        }

        // 404 for unknown routes
        return new Response(
            JSON.stringify({ error: "Not found" }),
            { status: 404, headers }
        );
    },
});

console.log(`Server running on http://localhost:${server.port}`);
console.log(`Available endpoints:`);
console.log(`  GET /routes - Get all light rail route data with next arrival times`);

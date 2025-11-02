# Light Rail Server

A backend service that provides real-time Sound Transit light rail data including routes, stops, and next arrival times.

## Features

- Real-time arrival predictions for all Sound Transit light rail routes (1 Line, 2 Line, T Line)
- Clean, minimal API response with only essential data
- Rate limiting to prevent API throttling
- CORS enabled for frontend access
- Automatic fallback from predicted to scheduled times

## API Endpoint

### GET `/api/routes`

Returns all light rail routes with stops and next arrival times.

**Response Format:**
```json
{
  "routeId": {
    "routeName": "1 Line",
    "destinations": [
      {
        "destination": "Angle Lake",
        "stops": [
          {
            "name": "Lynnwood City Center",
            "lat": 47.815403,
            "lon": -122.295185,
            "nextArrival": 1762105080000
          }
        ]
      }
    ]
  }
}
```

**Fields:**
- `routeName`: Name of the route (e.g., "1 Line", "2 Line", "T Line")
- `destination`: Direction/destination name
- `name`: Stop name
- `lat`, `lon`: Stop coordinates (for finding nearest stop)
- `nextArrival`: Unix timestamp in milliseconds (or `null` if no arrivals available)

## Local Development

### Prerequisites
- [Bun](https://bun.sh) installed

### Setup
```bash
# Install dependencies
bun install

# Run development server
bun dev
```

Server will start at `http://localhost:3000`

## Deploy to Vercel

### Quick Deploy

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and import your repository

3. Vercel will automatically detect the configuration and deploy

Your API will be available at:
```
https://your-project.vercel.app/api/routes
```

### CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Project Structure

```
lightrail-server/
├── api/
│   └── routes.ts          # Vercel serverless function
├── index.ts               # Local Bun server
├── package.json
├── vercel.json            # Vercel configuration
└── README.md
```

## Notes

- The service uses the OneBusAway API for Sound Transit data
- Rate limiting is implemented (5 stops per batch, 500ms delay)
- Some newer stations under construction may return `null` for `nextArrival`
- Vercel deployment uses serverless functions with 120s timeout

## Technology Stack

- Runtime: Bun (local) / Node.js (Vercel)
- API: OneBusAway SDK
- Deployment: Vercel

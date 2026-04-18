# TRAVEX — Travel Intelligence Module | LIFEX Platform

## Mapbox Token Setup

TRAVEX uses Mapbox GL for the admin-boundary globe. Get a free token:
1. Sign up at https://account.mapbox.com/
2. Create a token with default scopes
3. Add to ~/STAXX/travex/frontend/.env:
   VITE_MAPBOX_TOKEN=pk.eyJ...
4. Free tier: 50,000 map loads per month

Test at: http://localhost:3004/?globe=mapbox
Default view (NetworkGlobe): http://localhost:3004/

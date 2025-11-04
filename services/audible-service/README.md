# Audible Integration Python Service

This microservice provides Audible API integration using the Python `audible` library.

## Setup

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your keys
```

3. Run service:
```bash
python app.py
```

Service will run on `http://localhost:5000`

### Docker Deployment

1. Build image:
```bash
docker build -t audible-service .
```

2. Run container:
```bash
docker run -p 5000:5000 \
  -e ENCRYPTION_KEY=your_key \
  -e API_SECRET=your_secret \
  audible-service
```

### Railway Deployment

1. Create new Railway service
2. Connect to GitHub repo
3. Set root directory to `/services/audible-service`
4. Add environment variables:
   - `ENCRYPTION_KEY`
   - `API_SECRET`
   - `PORT` (Railway sets automatically)

## API Endpoints

### `POST /api/auth`
Authenticate with Audible credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "country_code": "us"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "encrypted_token",
  "refresh_token": "encrypted_token",
  "device_serial": "encrypted_serial",
  "expires_at": "2025-01-01T00:00:00Z"
}
```

### `POST /api/library`
Fetch user's complete Audible library with progress.

**Request:**
```json
{
  "access_token": "encrypted_token",
  "refresh_token": "encrypted_token",
  "country_code": "us"
}
```

**Response:**
```json
{
  "success": true,
  "books": [
    {
      "asin": "B001234567",
      "title": "Book Title",
      "authors": ["Author Name"],
      "narrators": ["Narrator Name"],
      "runtime_length_min": 600,
      "cover_url": "https://...",
      "release_date": "2024-01-01",
      "percent_complete": 45,
      "position_seconds": 16200,
      "is_finished": false,
      "isbn": "9781234567890"
    }
  ],
  "total_count": 1
}
```

### `POST /api/progress/<asin>`
Get progress for specific book.

### `POST /api/refresh-token`
Refresh expired access token.

### `GET /health`
Health check endpoint.

## Security

- All tokens are encrypted using Fernet (symmetric encryption)
- API requests must include `X-API-Secret` header
- Tokens are never stored in logs
- CORS is configured for Next.js frontend

## Rate Limiting

Audible API has rate limits (~10 requests/minute recommended). The Next.js backend handles rate limiting logic.

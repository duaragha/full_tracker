"""
Audible Integration Python Microservice

This service uses the `audible` library to authenticate and fetch library data.
It runs as a separate HTTP service that Next.js API routes communicate with.

Install dependencies:
    pip install audible flask flask-cors cryptography

Run service:
    python app.py

Docker deployment:
    docker build -t audible-service .
    docker run -p 5000:5000 audible-service
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from flask import Flask, request, jsonify
from flask_cors import CORS
import audible
from cryptography.fernet import Fernet

# ============================================
# FLASK APP SETUP
# ============================================

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

# This should match your Next.js ENCRYPTION_KEY for consistency
# Or use a separate key specifically for this service
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '').encode()
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY environment variable must be set")

cipher_suite = Fernet(ENCRYPTION_KEY)

# Service configuration
PORT = int(os.getenv('PORT', 5000))
API_SECRET = os.getenv('API_SECRET', '')  # Shared secret for API calls from Next.js

if not API_SECRET:
    logger.warning("API_SECRET not set - service will accept unauthenticated requests!")

# ============================================
# HELPER FUNCTIONS
# ============================================

def verify_api_secret(request_secret: str) -> bool:
    """Verify the API secret from request header"""
    if not API_SECRET:
        return True  # No secret configured, allow all
    return request_secret == API_SECRET


def encrypt(text: str) -> str:
    """Encrypt sensitive data"""
    return cipher_suite.encrypt(text.encode()).decode()


def decrypt(encrypted_text: str) -> str:
    """Decrypt sensitive data"""
    return cipher_suite.decrypt(encrypted_text.encode()).decode()


def create_audible_client(
    access_token: str,
    refresh_token: str,
    country_code: str = 'us'
) -> audible.Client:
    """Create an authenticated Audible client"""
    auth = audible.Authenticator.from_login_external(
        access_token=decrypt(access_token),
        refresh_token=decrypt(refresh_token),
        locale=audible.Locale(country_code)
    )

    return audible.Client(auth)


# ============================================
# API ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'audible-integration',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/api/auth', methods=['POST'])
def authenticate():
    """
    Authenticate with Audible and return encrypted tokens

    Request body:
    {
        "email": "user@example.com",
        "password": "password123",
        "country_code": "us"
    }

    Response:
    {
        "success": true,
        "access_token": "encrypted_token",
        "refresh_token": "encrypted_token",
        "device_serial": "encrypted_serial",
        "expires_at": "2025-01-01T00:00:00Z"
    }
    """
    try:
        # Verify API secret
        api_secret = request.headers.get('X-API-Secret', '')
        if not verify_api_secret(api_secret):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        country_code = data.get('country_code', 'us')

        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400

        logger.info(f"Authenticating user: {email} (country: {country_code})")

        # Authenticate with Audible
        auth = audible.Authenticator.from_login(
            username=email,
            password=password,
            locale=audible.Locale(country_code),
            with_username=False
        )

        # Extract tokens
        access_token = auth.access_token
        refresh_token = auth.refresh_token
        device_serial = auth.device_info.get('device_serial_number', '')

        # Token expiration (Audible tokens typically last 1 hour)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        # Encrypt tokens before returning
        return jsonify({
            'success': True,
            'access_token': encrypt(access_token),
            'refresh_token': encrypt(refresh_token),
            'device_serial': encrypt(device_serial),
            'expires_at': expires_at.isoformat() + 'Z'
        })

    except audible.exceptions.BadRequest as e:
        logger.error(f"Authentication failed: {e}")
        return jsonify({
            'success': False,
            'error': 'Invalid email or password'
        }), 400

    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}")
        return jsonify({
            'success': False,
            'error': f'Authentication error: {str(e)}'
        }), 500


@app.route('/api/library', methods=['POST'])
def get_library():
    """
    Fetch user's Audible library with progress

    Request body:
    {
        "access_token": "encrypted_token",
        "refresh_token": "encrypted_token",
        "country_code": "us"
    }

    Response:
    {
        "success": true,
        "books": [...],
        "total_count": 42
    }
    """
    try:
        # Verify API secret
        api_secret = request.headers.get('X-API-Secret', '')
        if not verify_api_secret(api_secret):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        data = request.get_json()
        access_token = data.get('access_token')
        refresh_token = data.get('refresh_token')
        country_code = data.get('country_code', 'us')

        if not access_token or not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Tokens are required'
            }), 400

        logger.info(f"Fetching library for country: {country_code}")

        # Create Audible client
        client = create_audible_client(access_token, refresh_token, country_code)

        # Fetch library
        library_response = client.get(
            "library",
            num_results=1000,  # Fetch all books
            response_groups="product_desc,product_attrs,media,last_position_heard",
            sort_by="PurchaseDate"
        )

        items = library_response.get('items', [])
        logger.info(f"Found {len(items)} books in library")

        # Transform to our format
        books = []
        for item in items:
            product = item.get('product', {})
            last_position = item.get('last_position_heard', {})

            # Extract runtime
            runtime_min = product.get('runtime_length_min', 0)
            if not runtime_min:
                # Fallback to seconds if available
                runtime_sec = product.get('runtime_length_sec', 0)
                runtime_min = runtime_sec // 60

            # Calculate progress
            position_sec = last_position.get('position_in_book_seconds', 0)
            percent_complete = 0
            if runtime_min > 0:
                percent_complete = min(100, int((position_sec / (runtime_min * 60)) * 100))

            # Extract authors and narrators
            authors = [a.get('name', '') for a in product.get('authors', [])]
            narrators = [n.get('name', '') for n in product.get('narrators', [])]

            # ISBN (if available)
            isbn = product.get('isbn', None)

            # Release date
            release_date = product.get('release_date', None)

            books.append({
                'asin': item.get('asin'),
                'title': product.get('title', 'Unknown'),
                'authors': authors,
                'narrators': narrators,
                'runtime_length_min': runtime_min,
                'cover_url': product.get('product_images', {}).get('500', ''),
                'release_date': release_date,
                'percent_complete': percent_complete,
                'position_seconds': position_sec,
                'is_finished': last_position.get('status') == 'Finished',
                'isbn': isbn
            })

        return jsonify({
            'success': True,
            'books': books,
            'total_count': len(books)
        })

    except audible.exceptions.UnauthorizedRequest:
        logger.error("Tokens expired or invalid")
        return jsonify({
            'success': False,
            'error': 'Token expired',
            'needs_auth': True
        }), 401

    except Exception as e:
        logger.error(f"Error fetching library: {e}")
        return jsonify({
            'success': False,
            'error': f'Library fetch error: {str(e)}'
        }), 500


@app.route('/api/progress/<asin>', methods=['POST'])
def get_progress(asin: str):
    """
    Get progress for a specific book

    Request body:
    {
        "access_token": "encrypted_token",
        "refresh_token": "encrypted_token",
        "country_code": "us"
    }

    Response:
    {
        "success": true,
        "asin": "B001234567",
        "position_seconds": 3600,
        "percent_complete": 25,
        "is_finished": false
    }
    """
    try:
        # Verify API secret
        api_secret = request.headers.get('X-API-Secret', '')
        if not verify_api_secret(api_secret):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        data = request.get_json()
        access_token = data.get('access_token')
        refresh_token = data.get('refresh_token')
        country_code = data.get('country_code', 'us')

        if not access_token or not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Tokens are required'
            }), 400

        logger.info(f"Fetching progress for ASIN: {asin}")

        # Create Audible client
        client = create_audible_client(access_token, refresh_token, country_code)

        # Fetch specific book info
        library_response = client.get(
            "library",
            asin=asin,
            response_groups="media,last_position_heard"
        )

        items = library_response.get('items', [])
        if not items:
            return jsonify({
                'success': False,
                'error': 'Book not found in library'
            }), 404

        item = items[0]
        product = item.get('product', {})
        last_position = item.get('last_position_heard', {})

        runtime_min = product.get('runtime_length_min', 0)
        position_sec = last_position.get('position_in_book_seconds', 0)
        percent_complete = 0

        if runtime_min > 0:
            percent_complete = min(100, int((position_sec / (runtime_min * 60)) * 100))

        return jsonify({
            'success': True,
            'asin': asin,
            'position_seconds': position_sec,
            'percent_complete': percent_complete,
            'is_finished': last_position.get('status') == 'Finished'
        })

    except audible.exceptions.UnauthorizedRequest:
        logger.error("Tokens expired or invalid")
        return jsonify({
            'success': False,
            'error': 'Token expired',
            'needs_auth': True
        }), 401

    except Exception as e:
        logger.error(f"Error fetching progress: {e}")
        return jsonify({
            'success': False,
            'error': f'Progress fetch error: {str(e)}'
        }), 500


@app.route('/api/refresh-token', methods=['POST'])
def refresh_token():
    """
    Refresh expired tokens

    Request body:
    {
        "refresh_token": "encrypted_token",
        "country_code": "us"
    }

    Response:
    {
        "success": true,
        "access_token": "encrypted_new_token",
        "expires_at": "2025-01-01T00:00:00Z"
    }
    """
    try:
        # Verify API secret
        api_secret = request.headers.get('X-API-Secret', '')
        if not verify_api_secret(api_secret):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        data = request.get_json()
        refresh_token_enc = data.get('refresh_token')
        country_code = data.get('country_code', 'us')

        if not refresh_token_enc:
            return jsonify({
                'success': False,
                'error': 'Refresh token is required'
            }), 400

        logger.info("Refreshing access token")

        # Note: audible library handles refresh automatically
        # This endpoint is for explicit refresh requests
        auth = audible.Authenticator.from_login_external(
            access_token="",  # Will be refreshed
            refresh_token=decrypt(refresh_token_enc),
            locale=audible.Locale(country_code)
        )

        # Refresh
        auth.refresh_access_token()

        expires_at = datetime.utcnow() + timedelta(hours=1)

        return jsonify({
            'success': True,
            'access_token': encrypt(auth.access_token),
            'expires_at': expires_at.isoformat() + 'Z'
        })

    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        return jsonify({
            'success': False,
            'error': f'Token refresh error: {str(e)}'
        }), 500


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    logger.info(f"Starting Audible Integration Service on port {PORT}")
    logger.info(f"API Secret configured: {bool(API_SECRET)}")

    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=os.getenv('DEBUG', 'false').lower() == 'true'
    )

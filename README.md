# Reachly Twitter Proxy

Twitter API proxy service for Reachly platform to bypass Cloudflare restrictions.

## Deployment

This project is automatically deployed to Netlify.

## Function

- `/.netlify/functions/twitter-proxy` - Proxies Twitter API requests

## Usage

```javascript
POST /.netlify/functions/twitter-proxy
{
  "username": "twitter_username",
  "cookies": {
    "auth_token": "...",
    "ct0": "..."
  }
}
```

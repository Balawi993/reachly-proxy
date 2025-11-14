// Netlify Function للـ Twitter Proxy
exports.handler = async (event, context) => {
  // السماح بـ CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, cookies } = JSON.parse(event.body);
    
    console.log('Proxy request for username:', username);
    
    const response = await fetch(`https://x.com/i/api/1.1/users/show.json?screen_name=${username}`, {
      headers: {
        'authorization': `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
        'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
        'x-csrf-token': cookies.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://x.com/',
        'origin': 'https://x.com',
      }
    });

    console.log('Twitter API response status:', response.status);
    
    // التحقق من نوع المحتوى
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText.substring(0, 200));
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `HTTP ${response.status}`, 
          details: errorText.substring(0, 200),
          contentType: contentType
        })
      };
    }
    
    // التحقق من أن الاستجابة JSON
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    } else {
      const textResponse = await response.text();
      console.log('Non-JSON response:', textResponse.substring(0, 200));
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ 
          error: 'Non-JSON response from Twitter API',
          contentType: contentType,
          response: textResponse.substring(0, 200)
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

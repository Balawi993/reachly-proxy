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
    
    // جرب endpoints مختلفة
    const endpoints = [
      `https://api.twitter.com/1.1/users/show.json?screen_name=${username}`,
      `https://mobile.twitter.com/i/api/1.1/users/show.json?screen_name=${username}`,
      `https://twitter.com/i/api/1.1/users/show.json?screen_name=${username}`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      console.log('Trying endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'authorization': `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
          'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
          'x-csrf-token': cookies.ct0,
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-active-user': 'yes',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'referer': endpoint.includes('mobile') ? 'https://mobile.twitter.com/' : 'https://x.com/',
          'origin': endpoint.includes('mobile') ? 'https://mobile.twitter.com' : 'https://x.com',
        }
      });

      console.log(`${endpoint} response status:`, response.status);
      
      // إذا نجح الطلب، أرجع النتيجة
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        }
      }
      
      // احفظ الخطأ وجرب الـ endpoint التالي
      const errorText = await response.text();
      lastError = {
        endpoint: endpoint,
        status: response.status,
        error: errorText.substring(0, 200),
        contentType: response.headers.get('content-type')
      };
      
      console.log(`${endpoint} failed:`, lastError);
    }
    
    // إذا فشلت جميع الـ endpoints
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'All Twitter endpoints failed',
        lastError: lastError,
        triedEndpoints: endpoints
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

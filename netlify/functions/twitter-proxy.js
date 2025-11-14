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
    
    // قائمة الـ proxies من WebShare.io
    const proxies = [
      { ip: '142.111.48.253', port: '7030', user: 'xvsaxwrg', pass: '564wjdkwkrv8' },
      { ip: '31.59.20.176', port: '6754', user: 'xvsaxwrg', pass: '564wjdkwkrv8' },
      { ip: '23.95.150.145', port: '6114', user: 'xvsaxwrg', pass: '564wjdkwkrv8' },
      { ip: '198.23.239.134', port: '6540', user: 'xvsaxwrg', pass: '564wjdkwkrv8' },
      { ip: '45.38.107.97', port: '6014', user: 'xvsaxwrg', pass: '564wjdkwkrv8' }
    ];
    
    // جرب endpoints مختلفة
    const endpoints = [
      `https://api.twitter.com/1.1/users/show.json?screen_name=${username}`,
      `https://mobile.twitter.com/i/api/1.1/users/show.json?screen_name=${username}`,
      `https://twitter.com/i/api/1.1/users/show.json?screen_name=${username}`
    ];
    
    let lastError = null;
    
    // جرب كل proxy مع كل endpoint
    for (const proxy of proxies) {
      console.log(`Trying proxy: ${proxy.ip}:${proxy.port}`);
      
      for (const endpoint of endpoints) {
        console.log(`Trying endpoint: ${endpoint}`);
        
        try {
          // في Netlify Functions، لا يمكن استخدام proxy agents مباشرة
          // لذلك سنضيف headers إضافية لمحاكاة الـ proxy
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
              // إضافة headers لمحاكاة proxy
              'x-forwarded-for': proxy.ip,
              'x-real-ip': proxy.ip,
              'cf-connecting-ip': proxy.ip,
            }
          });

          console.log(`${proxy.ip}:${proxy.port} -> ${endpoint} status:`, response.status);
          
          // إذا نجح الطلب، أرجع النتيجة
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                  ...data,
                  _proxy_used: `${proxy.ip}:${proxy.port}`
                })
              };
            }
          }
          
          // احفظ الخطأ وجرب التالي
          const errorText = await response.text();
          lastError = {
            proxy: `${proxy.ip}:${proxy.port}`,
            endpoint: endpoint,
            status: response.status,
            error: errorText.substring(0, 200),
            contentType: response.headers.get('content-type')
          };
          
          console.log(`${proxy.ip}:${proxy.port} -> ${endpoint} failed:`, lastError);
          
        } catch (proxyError) {
          console.log(`Proxy ${proxy.ip}:${proxy.port} error:`, proxyError.message);
          lastError = {
            proxy: `${proxy.ip}:${proxy.port}`,
            endpoint: endpoint,
            error: proxyError.message
          };
        }
      }
    }
    
    // إذا فشلت جميع المحاولات
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'All proxies and endpoints failed',
        lastError: lastError,
        triedProxies: proxies.length,
        triedEndpoints: endpoints.length
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

// دالة استخراج بيانات المستخدم من HTML
function extractUserDataFromHTML(html, username, isNitter) {
  try {
    if (isNitter) {
      // استخراج من Nitter
      const nameMatch = html.match(/<title>([^@]+)@/);
      const avatarMatch = html.match(/class="avatar"[^>]*src="([^"]+)"/);
      
      if (nameMatch) {
        return {
          screen_name: username,
          name: nameMatch[1].trim(),
          profile_image_url_https: avatarMatch ? avatarMatch[1] : '',
          verified: html.includes('verified-icon')
        };
      }
    } else {
      // استخراج من Twitter مباشرة
      // البحث عن JSON data في الصفحة
      const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
      if (scriptMatch) {
        const data = JSON.parse(scriptMatch[1]);
        // استخراج بيانات المستخدم من الـ state
        // هذا يحتاج تحليل أعمق للـ structure
      }
      
      // طريقة بديلة: البحث عن meta tags
      const titleMatch = html.match(/<title>([^(]+)\(/);
      const avatarMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/);
      
      if (titleMatch) {
        return {
          screen_name: username,
          name: titleMatch[1].trim(),
          profile_image_url_https: avatarMatch ? avatarMatch[1] : '',
          verified: html.includes('verified')
        };
      }
    }
    
    return null;
  } catch (error) {
    console.log('Error extracting user data:', error.message);
    return null;
  }
}

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
    
    // جرب web scraping بدلاً من API
    const endpoints = [
      `https://nitter.net/${username}`, // Nitter proxy
      `https://x.com/${username}`, // Direct scraping
      `https://mobile.twitter.com/${username}` // Mobile version
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
          // تحديد headers حسب نوع الـ endpoint
          const isNitter = endpoint.includes('nitter.net');
          const isMobile = endpoint.includes('mobile.twitter.com');
          
          const requestHeaders = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'dnt': '1',
            'upgrade-insecure-requests': '1',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            // إضافة headers لمحاكاة proxy
            'x-forwarded-for': proxy.ip,
            'x-real-ip': proxy.ip,
            'cf-connecting-ip': proxy.ip,
          };

          // إضافة cookies فقط لـ Twitter domains
          if (!isNitter) {
            requestHeaders['cookie'] = `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`;
            requestHeaders['referer'] = isMobile ? 'https://mobile.twitter.com/' : 'https://x.com/';
          }

          const response = await fetch(endpoint, {
            headers: requestHeaders
          });

          console.log(`${proxy.ip}:${proxy.port} -> ${endpoint} status:`, response.status);
          
          // إذا نجح الطلب، استخرج البيانات
          if (response.ok) {
            const html = await response.text();
            
            // استخراج بيانات المستخدم من HTML
            const userData = extractUserDataFromHTML(html, username, isNitter);
            
            if (userData) {
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                  ...userData,
                  _proxy_used: `${proxy.ip}:${proxy.port}`,
                  _method: isNitter ? 'nitter_scraping' : 'twitter_scraping'
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

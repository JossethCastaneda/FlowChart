async function run() {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;
  const csrfCookie = csrfRes.headers.get('set-cookie');

  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': csrfCookie.split(';')[0]
    },
    body: JSON.stringify({
      email: 'josseth@example.com',
      password: 'password123',
      redirect: false,
      callbackUrl: 'http://localhost:3000/dashboard/resumen',
      csrfToken: csrfToken
    })
  });

  console.log("LOGIN STATUS:", loginRes.status);
  const loginJson = await loginRes.json();
  console.log("LOGIN RESP:", loginJson);
  
  const setCookieHeader = loginRes.headers.get('set-cookie');
  console.log("LOGIN SET-COOKIE:", setCookieHeader);
}

run();

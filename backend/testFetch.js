async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ecommerce.com', password: 'AdminPassword123' })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);

    if (!loginData.success) {
      console.error('Login failed!');
      return;
    }

    const token = loginData.token;

    console.log('\nFetching /auth/me...');
    const meRes = await fetch('http://localhost:5000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meText = await meRes.text();
    console.log('Me Response status:', meRes.status);
    console.log('Me Response text (first 200 chars):', meText.substring(0, 200));

    console.log('\nFetching /analytics/metrics...');
    const metricsRes = await fetch('http://localhost:5000/api/analytics/metrics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const metricsText = await metricsRes.text();
    console.log('Metrics Response status:', metricsRes.status);
    console.log('Metrics Response text (first 200 chars):', metricsText.substring(0, 200));

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

test();

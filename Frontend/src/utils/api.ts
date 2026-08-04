const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const getImageUrl = (path: string | null | undefined): string => {
  const fallbackSvg = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6I2YxZjVmOSI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDE2IDEwIDUgMjEiLz48L3N2Zz4=`;
  if (!path) return fallbackSvg;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const baseUrl = API_BASE_URL.endsWith('/api') 
    ? API_BASE_URL.slice(0, -4) 
    : API_BASE_URL;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  // Check if body is FormData
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If not FormData, assume JSON
  if (!isFormData && !headers['Content-Type' as keyof typeof headers]) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  // Debug output is gated to development. In production these lines ran on
  // every admin request, echoing endpoint paths and up to 500 characters of
  // raw error bodies into the browser console — a ready-made map of the
  // internal API for anyone with devtools open, and a leak of any sensitive
  // content the server included in an error page.
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // A 401 means the session is gone (expired, revoked, or logged out
    // elsewhere). Clear local state so the UI cannot keep presenting an
    // authenticated shell backed by a dead token.
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    let json: any;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      json = await response.json();
    } else {
      if (isDev) {
        const text = await response.text();
        console.error(`[API] Non-JSON response (${response.status}):`, text.substring(0, 500));
      }
      throw new Error(`The server returned an unexpected response (status ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(json.message || 'An error occurred during the request');
    }

    return json as T; // Return full response which has success and data/payload
  } catch (error: any) {
    if (isDev) console.error('[API] Request failed:', error.message);
    throw error;
  }
};

export const api = {
  get: <T = any>(endpoint: string, headers?: HeadersInit) => 
    request<T>(endpoint, { method: 'GET', headers }),
    
  post: <T = any>(endpoint: string, data: any, headers?: HeadersInit) => 
    request<T>(endpoint, { 
      method: 'POST', 
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers 
    }),
    
  put: <T = any>(endpoint: string, data: any, headers?: HeadersInit) => 
    request<T>(endpoint, { 
      method: 'PUT', 
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers 
    }),
    
  patch: <T = any>(endpoint: string, data: any, headers?: HeadersInit) => 
    request<T>(endpoint, { 
      method: 'PATCH', 
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers 
    }),
    
  delete: <T = any>(endpoint: string, headers?: HeadersInit) => 
    request<T>(endpoint, { method: 'DELETE', headers }),
};

export default api;

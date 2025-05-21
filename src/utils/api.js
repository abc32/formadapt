// src/utils/api.js
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  // Set Content-Type to application/json by default if not already set and if there's a body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Unauthorized access
    console.error('Unauthorized access - redirecting to login. URL:', url);
    // Clear user data
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    
    // Redirect to login page. 
    // This is a simple way to redirect. For more complex apps, 
    // you might want to use React Router's navigation programmatically 
    // or dispatch an action to update app state.
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    // Throw an error to stop further processing in the calling function
    // after a 401, as the user is no longer authenticated.
    throw new Error('Unauthorized'); 
  }
  return response;
}

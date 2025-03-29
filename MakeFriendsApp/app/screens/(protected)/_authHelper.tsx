// authHelper.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config.json';

const BACKEND_URL = config.url;

// Refresh the access token using the refresh token.
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await fetch(`${BACKEND_URL}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (response.ok) {
    const data = await response.json();
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    return data.access;
  } else {
    throw new Error("Token refresh failed");
  }
}

// A custom fetch wrapper that automatically attempts to refresh the token on 401 errors.
export async function apiFetch(url: string, options: any = {}, retry = true): Promise<Response> {
  let token = await AsyncStorage.getItem('access_token');
  if (!options.headers) {
    options.headers = {};
  }
  options.headers['Authorization'] = `Bearer ${token}`;
  let response = await fetch(url, options);
  if (response.status === 401 && retry) {
    try {
      token = await refreshAccessToken();
      options.headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, options);
    } catch (error) {
      throw error;
    }
  }
  return response;
}

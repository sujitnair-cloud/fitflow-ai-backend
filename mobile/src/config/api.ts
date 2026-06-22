// On iOS simulator / web, localhost works.
// On Android emulator use http://10.0.2.2:3001
// On a real device, set EXPO_PUBLIC_API_URL to your machine's LAN IP in .env
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

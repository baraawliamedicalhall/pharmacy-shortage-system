import os from 'os'

export interface NetworkInterfaceInfo {
  name: string
  ip: string
  url: string
}

export function getLocalNetworkInterfaces(port = 3000): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces()
  const results: NetworkInterfaceInfo[] = []

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue
    for (const net of netList) {
      // Look for IPv4 addresses that are not loopback (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        results.push({
          name,
          ip: net.address,
          url: `http://${net.address}:${port}`,
        })
      }
    }
  }

  // Fallback if no network interface found
  if (results.length === 0) {
    results.push({
      name: 'localhost',
      ip: '127.0.0.1',
      url: `http://localhost:${port}`,
    })
  }

  return results
}

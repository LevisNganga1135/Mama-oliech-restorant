#!/bin/bash

# start-mpesa-tunnel.sh
# Starts ngrok tunnel, retrieves public URL, and updates .env configuration for local M-Pesa Daraja testing

# 1. Determine Port from .env or default to 5000
PORT=5000
if [ -f .env ]; then
  ENV_PORT=$(grep -E "^PORT=" .env | cut -d= -f2 | tr -d '\r' | xargs 2>/dev/null)
  if [ ! -z "$ENV_PORT" ]; then
    PORT=$ENV_PORT
  fi
fi

echo "🚀 Starting ngrok tunnel on port $PORT..."
# Start ngrok in the background and redirect output to prevent terminal noise
ngrok http $PORT > /dev/null &
NGROK_PID=$!

# Ensure the ngrok process is terminated when the script exits
trap "echo -e '\n🛑 Stopping ngrok tunnel...'; kill $NGROK_PID 2>/dev/null; exit" INT TERM EXIT

# 2. Wait for ngrok API to become ready (up to 15 seconds)
echo "⏳ Waiting for ngrok tunnel to be established..."
TUNNEL_READY=false
for i in {1..15}; do
  if curl -s http://127.0.0.1:4040/api/tunnels > /dev/null; then
    TUNNEL_READY=true
    break
  fi
  sleep 1
done

if [ "$TUNNEL_READY" = false ]; then
  echo "❌ Error: Could not connect to ngrok local API at http://127.0.0.1:4040"
  echo "   Please verify that:"
  echo "   1. ngrok is installed and available on your PATH."
  echo "   2. You have authenticated ngrok using: ngrok config add-authtoken <your-token>"
  exit 1
fi

# 3. Retrieve the public HTTPS tunnel URL using Node.js for robust JSON parsing
TUNNEL_URL=$(node -e "
const http = require('http');
http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const httpsTunnel = json.tunnels.find(t => t.proto === 'https' || t.public_url.startsWith('https:'));
            if (httpsTunnel) {
                console.log(httpsTunnel.public_url);
            } else if (json.tunnels.length > 0) {
                console.log(json.tunnels[0].public_url);
            } else {
                process.exit(1);
            }
        } catch (e) {
            process.exit(1);
        }
    });
}).on('error', () => process.exit(1));
" 2>/dev/null)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Error: Failed to retrieve public HTTPS tunnel URL from ngrok API."
  exit 1
fi

CALLBACK_URL="${TUNNEL_URL}/api/payments/callback"
echo "✅ Tunnel successfully established: $TUNNEL_URL"
echo "🎯 M-Pesa Callback URL: $CALLBACK_URL"

# 4. Write/Update the MPESA_CALLBACK_URL in .env using Node.js to avoid cross-platform sed bugs
node -e "
const fs = require('fs');
const envPath = '.env';
let content = '';

if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
}

const regex = /^MPESA_CALLBACK_URL=.*$/m;
const newLine = 'MPESA_CALLBACK_URL=' + process.argv[2];

if (regex.test(content)) {
    content = content.replace(regex, newLine);
} else {
    // Append to end of file, ensuring proper newlines
    content = content.trimEnd() + '\n\n# M-Pesa Local Testing\n' + newLine + '\n';
}

fs.writeFileSync(envPath, content, 'utf8');
console.log('📝 Successfully updated .env with the new MPESA_CALLBACK_URL.');
" "$CALLBACK_URL"

echo ""
echo "💡 Next Steps:"
echo "   1. KEEP THIS TERMINAL OPEN to maintain the tunnel connection."
echo "   2. RESTART your Express backend server to load the updated .env configuration."
echo "   3. Press Ctrl+C in this terminal when you want to close the tunnel."
echo ""

# Keep the script running to maintain the background ngrok process
wait $NGROK_PID

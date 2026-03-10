# (Optional) Server API Access Password for enhanced security
# # Supports multiple passwords separated by commas (e.g., pass1,pass2,pass3)
ACCESS_PASSWORD=

# PostgreSQL Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=reading_assistant
POSTGRES_USER=reading_user
POSTgresPassword=your_secure_password_here

# Auth.js Configuration
AUTH_SECRET= # Generate with: npx auth secret"
AUTH_GOOGLE_ID= # Get from Google Cloud Console
AUTH_GOOGLE_SECRET= # Get from Google Cloud Console

# Google OAuth Configuration
# 1. Go to Google Cloud Console (https://console.cloud.google.com)
# 2. Create a new project
    3. Go to "API & Services" > "Credentials"
    4. Create OAuth 2.0 credentials
    5. Add authorized JavaScript origin:
       - Production: http://localhost:3333/api/auth/callback/google
       - Development: http://localhost:3333/api/auth/callback/google
    6. Copy the Client ID and Client Secret

    7. Test the endpoints: /api/auth/callback/google
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret

# Next.js Configuration
# For App Router, set up a route handlers
DATABASE_URL=postgresql://reading_user:your_password@postgres:5432/reading_assistant

# Run linting
npm run lint

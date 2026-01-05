# Orbit Chat - Secure End-to-End Encrypted Chat Application

A beautiful, space-themed secure messaging application with end-to-end encryption, built with modern web technologies.

## 🌟 Features

- **End-to-End Encryption (E2EE)**: All messages are encrypted using custom RSA + symmetric XOR encryption
- **Secure Key Exchange**: RSA-based key exchange protocol with symmetric key encryption
- **User Authentication**: Supabase Auth with email/password registration and login
- **Account Visibility**: Public or Private account modes
- **Message Requests**: Private users can receive and manage message requests
- **Real-time Messaging**: Real-time chat updates with encrypted payloads
- **User Search**: Find and message other users
- **Online Status**: See who's online with real-time indicators
- **Dark Mode UI**: Beautiful purple and neon space-themed interface
- **Modern Stack**: React + TypeScript + TailwindCSS + shadcn/ui

## 🛠️ Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: TailwindCSS (dark mode, purple accents)
- **Backend/Database**: Supabase (PostgreSQL + Auth)
- **Encryption**: Web Crypto API + Custom XOR symmetric cipher
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6

## 🔐 Security Architecture

### Key Exchange Flow
1. Server generates RSA key pair
2. Client fetches server's public key
3. Client generates random symmetric key (256-bit)
4. Client encrypts symmetric key using server's RSA public key
5. Server decrypts to obtain the shared symmetric key

### Message Encryption
- All messages encrypted with symmetric key using XOR cipher
- Unique nonce (16 bytes) generated per message
- Server never sees plaintext messages
- Encrypted payloads only relayed by server

### Database Security
- Row Level Security (RLS) policies enforce access control
- Encrypted content stored in `messages` table
- No plaintext messages in logs or database

## 📦 Database Schema

### Tables
- **profiles**: User profiles with visibility settings
- **user_roles**: User role assignments (admin, user)
- **chats**: Chat conversations between users
- **chat_participants**: User participation in chats
- **messages**: Encrypted messages with nonce
- **message_requests**: Friend requests for private users
- **connection_logs**: Server-side logging of events
- **chat_keys**: Encrypted symmetric keys per chat

### Security Policies
- Profiles viewable by everyone; users can only update their own
- Chat access restricted to participants
- Message visibility limited to chat members
- RLS policies enforce role-based access

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn or bun
- Supabase account

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd orbit-secure-chat

# Install dependencies
npm install

# Set up environment variables
# Edit .env with your Supabase credentials
```

### Environment Variables

Edit your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
orbit-secure-chat/
├── src/
│   ├── components/
│   │   ├── chat/          # Chat-related components
│   │   ├── layout/        # Layout components
│   │   ├── ui/            # shadcn/ui components
│   │   └── ...
│   ├── contexts/          # React contexts (Auth, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── integrations/
│   │   └── supabase/      # Supabase client and types
│   ├── lib/
│   │   ├── crypto.ts      # Encryption utilities
│   │   └── utils.ts       # General utilities
│   ├── pages/             # Page components
│   └── App.tsx            # Main app component
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions (if any)
└── package.json
```

## 🎨 Pages & Routes

- `/` - Landing page
- `/auth` - Authentication (login/signup)
- `/home` - Chat list (main chat view)
- `/search` - Search users
- `/requests` - Message requests (for private users)
- `/profile` - User profile
- `/settings` - App settings
- `/chat/:chatId` - Individual chat view

## 🔑 Key Components

### AuthContext
Manages user authentication state, profile data, and auth methods.

### Encryption Module (`lib/crypto.ts`)
- `generateSymmetricKey()` - Generate 256-bit symmetric key
- `generateNonce()` - Generate random nonce for each message
- `encryptMessage()` - Encrypt message with symmetric key
- `decryptMessage()` - Decrypt message payload
- `xorEncrypt/xorDecrypt()` - Custom XOR-based cipher

### Chat Components
- `ChatListItem` - Individual chat in list
- `MessageBubble` - Individual message display
- `MessageInput` - Message composition input
- `RequestCard` - Message request card
- `UserCard` - User profile card

## 🚢 Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

## 📝 Development Notes

### Adding New Migrations
1. Create migration files in `supabase/migrations/`
2. Run: `supabase migration up`

### Modifying UI Components
- Uses shadcn/ui as component library
- TailwindCSS for styling
- Dark mode enabled by default
- Purple (#a855f7) as primary accent color

### Adding Supabase Tables
1. Create migration file with SQL
2. Update TypeScript types in `src/integrations/supabase/types.ts`
3. Update auth context or services as needed

## 🔒 Security Checklist

- [ ] No plaintext messages stored in database
- [ ] All encryption/decryption handled on client-side
- [ ] Server-side RLS policies enforced
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly configured
- [ ] HTTPS enforced in production
- [ ] Content Security Policy headers configured
- [ ] Regular security audits performed

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)

## 📄 License

This project is provided as-is for secure communication purposes.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- Security implications are considered
- Comments explain complex encryption logic
- All features are tested before submission

---

Built with ❤️ for secure, private communication.

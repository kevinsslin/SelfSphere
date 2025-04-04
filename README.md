# ETH Taipei Discussion Platform

A decentralized discussion platform based on the ETHGlobal Taipei hackathon, allowing anonymous/semi-anonymous posting with identity verification via Self protocol and rewards via CELO blockchain.

## Features

- Connect wallet using RainbowKit (supports multiple wallet providers)
- User authentication and profile management
- Anonymous and semi-anonymous posting
- Restricted viewing and commenting based on Self identity verifications
- Reward system using CELO blockchain
  - First commenter token rewards
  - NFT badges for all commenters

## Tech Stack

- **Frontend**: Next.js, RainbowKit, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: CELO
- **Authentication**: Self Protocol, Wallet Connect

## Development Setup

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies**
   ```
   npm install
   # or
   yarn
   ```

3. **Setup Required API Keys**

   #### Supabase Setup
   - Create a Supabase project at [https://supabase.com](https://supabase.com)
   - After project creation, find your API credentials in Project Settings > API
   - Copy the "Project URL" and "anon/public" key
   - These will be used for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   #### WalletConnect Project ID (Required for RainbowKit)
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com/) and sign up/login
   - Create a new project (e.g., "ETH Taipei Platform")
   - Copy the "Project ID" provided
   - This will be used for `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

   #### Self Protocol (If needed)
   - If using Self Protocol features, follow their documentation to obtain API keys
   - Set the API key in your environment variables

4. **Set environment variables**
   - Copy `.env.example` to `.env.local`
   ```bash
   cp .env.example .env.local
   ```
   - Fill in the values in `.env.local` with the keys obtained in the previous step

5. **Initialize Database**

   The simplest way to create the database tables is through the Supabase SQL Editor:
   
   - Open your Supabase project dashboard
   - Navigate to the SQL Editor section
   - Create a new query
   - Open the file `supabase/init.sql` in your project
   - Copy the entire SQL content from this file
   - Paste it into the SQL Editor
   - Click "Run" to execute the SQL and create all required tables

6. **Run the development server**
   ```
   yarn dev
   # or
   npm run dev
   ```

## Environment Variables Explanation

| Variable | Description | Where to Obtain |
|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public API key | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project identifier | [WalletConnect Cloud](https://cloud.walletconnect.com/) |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

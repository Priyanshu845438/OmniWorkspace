# Local Development Guide

## Prerequisites
- Node.js 20 or 22+
- npm 10+
- Git 2.30+

## Getting Started
```bash
# 1. Install dependencies
npm install

# 2. Run both Server & Client in dev mode
npm run dev

# 3. Or run the Electron Windows Desktop dev container
npm run dev:electron
```

## Running Tests
```bash
# Run unit & integration test suites
npm test

# Run tests in watch mode
npm run test:watch
```

## Building for Production
```bash
# Full build: server, client, and electron
npm run build

# Package for Windows (.exe installer & portable binary)
npm run dist:win
```

# Contributing to Bomberman Online

First off, thank you for considering contributing to Bomberman Online! 🎮

This document provides guidelines and information about contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Project Architecture](#project-architecture)

## 📜 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code:

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome people of all backgrounds
- **Be constructive** - Provide helpful feedback and suggestions
- **Be patient** - Remember that everyone was a beginner once

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- A code editor (VS Code recommended)

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/bomberman-online.git
   cd bomberman-online
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original/bomberman-online.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

6. **Start development servers**
   ```bash
   npm run dev:all
   ```

## 💻 Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/tournament-brackets`)
- `fix/` - Bug fixes (e.g., `fix/bomb-collision-bug`)
- `refactor/` - Code refactoring (e.g., `refactor/game-state-management`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `test/` - Test additions/fixes (e.g., `test/player-movement`)

### Workflow Steps

1. **Sync with upstream**
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

4. **Run checks**
   ```bash
   npm run lint        # Check linting
   npm run type-check  # Check TypeScript
   npm run test        # Run tests
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Code Style Guide

### TypeScript

- **Strict mode** - All code must pass strict TypeScript checks
- **No `any`** - Avoid `any` types; create proper interfaces
- **Explicit types** - Add return types to functions
- **Interfaces over types** - Prefer interfaces for object shapes

```typescript
// ✅ Good
interface Player {
  id: string;
  username: string;
  score: number;
}

function getPlayer(id: string): Player | null {
  // ...
}

// ❌ Bad
function getPlayer(id: any) {
  // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PlayerCard.tsx` |
| Hooks | camelCase + use | `useGameState.ts` |
| Utils | camelCase | `formatTime.ts` |
| Types/Interfaces | PascalCase | `GameState`, `PlayerInput` |
| Constants | UPPER_SNAKE | `MAX_PLAYERS` |
| CSS classes | kebab-case | `player-card` |

### File Organization

```typescript
// 1. External imports
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports (grouped by type)
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Player } from '@/types/game';

// 3. Types/Interfaces (if not in separate file)
interface Props {
  playerId: string;
}

// 4. Constants
const REFRESH_INTERVAL = 5000;

// 5. Component/Function
export function PlayerProfile({ playerId }: Props) {
  // ...
}

// 6. Helper functions (if small and specific to this file)
function formatStats(stats: Stats): string {
  // ...
}
```

### React Components

```typescript
// ✅ Good - Functional component with proper types
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      className={cn('btn', variant)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Game Code

- **Server authority** - Never trust client state
- **Tick rate** - Server at 20Hz, client renders at 60 FPS
- **Network messages** - Use defined types from `/types/websocket.ts`

## 📨 Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or fixing tests
- `chore` - Build process, tooling, etc.

### Examples

```bash
# Feature
git commit -m "feat(lobby): add room code sharing"

# Bug fix
git commit -m "fix(game): resolve bomb collision detection"

# Documentation
git commit -m "docs: update API endpoint documentation"

# Breaking change
git commit -m "feat(api)!: change authentication flow

BREAKING CHANGE: JWT token format has changed"
```

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript checks pass (`npm run type-check`)
- [ ] Documentation is updated (if needed)
- [ ] CHANGELOG.md is updated (for features/fixes)

### PR Guidelines

1. **Use the PR template** - Fill out all sections
2. **Keep PRs focused** - One feature/fix per PR
3. **Write descriptive titles** - Use conventional commit format
4. **Add screenshots** - For UI changes
5. **Link issues** - Reference related issues
6. **Request reviews** - Tag appropriate reviewers

### Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment information

### Feature Requests

Use the feature request template and include:

- Problem description
- Proposed solution
- Alternatives considered
- Additional context

### Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Issue priority

## 🏗️ Project Architecture

### Key Systems

1. **Authentication** - Clerk handles auth, syncs to Supabase
2. **Database** - Supabase with RLS policies
3. **Game Engine** - PixiJS with custom systems
4. **Game Server** - Authoritative WebSocket server
5. **Real-time** - Supabase Realtime + WebSocket

### Important Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI agent instructions |
| `middleware.ts` | Route protection |
| `game/engine/Game.ts` | Main game class |
| `server/GameState.ts` | Server game state |
| `types/websocket.ts` | Network protocol |

### Adding New Features

1. **Check PLAN.md** - Review the orchestration plan
2. **Follow patterns** - Match existing code structure
3. **Update types** - Add TypeScript definitions
4. **Add tests** - Unit and integration tests
5. **Update docs** - API docs, README, etc.

## ❓ Questions?

- Check existing issues and discussions
- Join our Discord community
- Open a discussion on GitHub

---

Thank you for contributing! 💣🎮

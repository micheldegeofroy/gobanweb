# Claude Instructions for Goban Web

## Development Server
Always run the development server on port **30001**:
```bash
npm run dev -- -p 30001
```

Local URL: http://localhost:30001/

## Resuming Sessions
To reconnect with bypass permissions and continue from previous session:
```bash
claude --dangerously-skip-permissions --continue
```

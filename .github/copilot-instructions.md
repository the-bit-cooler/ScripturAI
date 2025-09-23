<!-- ScripturAI: guidance for AI coding agents -->
# ScripturAI — Copilot Instructions

This file gives concise, actionable guidance for AI coding agents working in the ScripturAI repository. Focus on discoverable, concrete patterns and workflows.

1. Big picture
- **Architecture:** two main components: `backend/` (Azure Functions, .NET 8 isolated worker) and `frontend/` (Expo React Native app). The backend exposes HTTP-triggered Azure Functions (see `backend/FetchScripture.cs`). The frontend is an Expo app using `expo-router` (see `frontend/package.json`).
- **Data flow:** frontend communicates with the backend over HTTP to call Azure Functions. Backend configuration and run-time secrets come from `backend/local.settings.json` and the Azure Functions host (`backend/host.json`). Blob/queue storage artifacts appear at the repository root under `__blobstorage__` and `__queuestorage__` — treat these as local Azurite test data.

2. How to run and debug locally
- **Backend (Azure Functions):** Use `dotnet` tooling in `backend/`. Typical operations are:
  - `dotnet build` (project folder) — there are VS Code tasks defined in the repo for `build (functions)` and `publish (functions)`.
  - The code is a dotnet-isolated Azure Functions worker; run with the Functions host (`func host start`) pointing to `backend/bin/Debug/net8.0`. The repo includes a `bin/Debug/net8.0` output tree.
- **Frontend (Expo):** in `frontend/` use `npm`/`yarn` with these scripts in `package.json`:
  - `npm run start` (or `yarn start`) — runs `expo start --tunnel`.
  - `npm run android|ios|web` — start expo for specific platform.

3. Important files and patterns
- `backend/FetchScripture.cs` — example HTTP-triggered function; new functions should follow the same pattern and be registered via function attributes `[Function("Name")]`.
- `backend/Program.cs` — the minimal Functions host builder using `FunctionsApplication.CreateBuilder(args)` and ApplicationInsights integration.
- `backend/local.settings.json` — local Functions settings. Do not commit secrets; this file uses `UseDevelopmentStorage=true` for `AzureWebJobsStorage`.
- `frontend/package.json` — shows Expo SDK versions and scripts. Use `expo-router` entry point `expo-router/entry`.
- Storage test artifacts: `__blobstorage__/` and `__queuestorage__/` contain Azurite files. Use Azurite or the local Functions storage emulator when testing storage interactions.

4. Project-specific conventions
- Keep backend code in `backend/` as Azure Functions projects (C# .NET 8 isolated). Prefer function classes per logical domain (e.g., `FetchScripture`) and use dependency injection via `Program.cs` builder for shared services.
- Frontend uses Expo Router and React 19. Keep pages under `frontend/app/` and components under `frontend/app/components/` and `frontend/app/ui/`.
- Tests: no test harness is present; if adding tests, place backend tests alongside a `tests/` folder and use `dotnet test` for .NET projects.

5. Integration points and external dependencies
- Azure services: Functions runtime, Application Insights (configured in `Program.cs` and `host.json`), and Azure Storage (emulated by Azurite locally). The codebase expects `FUNCTIONS_WORKER_RUNTIME=dotnet-isolated`.
- Frontend: Expo SDK and React Native ecosystem packages listed in `frontend/package.json`.

6. Code style and PR guidance
- Make small, focused PRs; new Azure Functions should include a short README entry if they add new runtime settings or require local Azurite setup.
- When changing backend: run `dotnet build` and ensure the compiled artifacts land under `backend/bin/Debug/net8.0` as the `func host` task expects.

7. Examples and quick references
- Add an HTTP function: copy `backend/FetchScripture.cs`, update the `[Function("Name")]` attribute, implement the route handler, and register any DI services in `Program.cs`.
- Start frontend locally:
  ```bash
  cd frontend
  npm install
  npm run start
  ```
- Start backend locally (from repo root):
  ```bash
  cd backend
  dotnet build
  # from backend/bin/Debug/net8.0 run the Azure Functions host (or use VS Code task)
  func host start
  ```

8. When in doubt
- Inspect `backend/Program.cs`, `backend/FetchScripture.cs`, and `frontend/package.json` for the patterns to follow.
- Use Azurite for local storage testing and `local.settings.json` for runtime values.

If any parts of the runtime, CI, or developer flows are missing or you'd like me to expand examples (e.g., how to run the Functions host from VS Code tasks or add a CI workflow), tell me which area to expand.

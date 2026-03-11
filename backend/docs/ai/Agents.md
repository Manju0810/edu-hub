## Development Rules for Agents

### 1. Use NVM Before Running npm Commands

Before executing any `npm` or `node` commands, always load NVM by running:

```
. "$HOME/.nvm/nvm.sh"
```

This ensures the correct Node.js version is used.

---

### 2. Install Dependencies Using Exact Versions

Always install dependencies using exact versions to avoid unintended upgrades.

Example:

```
npm install --save-exact <package-name>
```

---

### 3. Run Code Quality Checks After Making Changes

After implementing any code changes, run the following commands:

```
npm run lint:fix
npm run prettier:fix
npm run test
```

All commands must complete successfully before considering the task finished.

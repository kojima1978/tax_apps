import app from './app';
import { config } from './config/env';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Inheritance Tax Case Management API Server              ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(43)}║
║  Port:        ${String(PORT).padEnd(43)}║
║  Frontend:    ${config.frontendUrl.padEnd(43)}║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
